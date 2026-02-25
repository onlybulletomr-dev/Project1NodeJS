const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const companyRoutes = require('./routes/companyRoutes');
const customerRoutes = require('./routes/customerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const itemRoutes = require('./routes/itemRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const vehicleDetailRoutes = require('./routes/vehicleDetailRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const seedRoutes = require('./routes/seedRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'https://project1-frontend-8abj.onrender.com', 'https://project1-backend1.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Branch-Id']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', companyRoutes);
app.use('/api', customerRoutes);
app.use('/api', employeeRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', itemRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', vehicleDetailRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', seedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Migration endpoint - rename vehicledetails to vehicledetail
app.post('/admin/migrate/rename-vehicledetails', async (req, res) => {
  try {
    console.log('[Migration Endpoint] Starting table rename migration...');
    const pool = require('./config/db');
    const client = await pool.connect();
    
    try {
      // Step 1: Check what tables exist
      const allTablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const allTables = allTablesRes.rows.map(r => r.table_name);
      const hasVehicledetails = allTables.includes('vehicledetails');
      const hasVehicledetail = allTables.includes('vehicledetail');
      
      console.log('[Migration] All tables:', allTables);
      console.log('[Migration] vehicledetails exists:', hasVehicledetails);
      console.log('[Migration] vehicledetail exists:', hasVehicledetail);
      
      // If both don't exist, error
      if (!hasVehicledetails && !hasVehicledetail) {
        return res.status(400).json({
          success: false,
          message: 'Neither vehicledetails nor vehicledetail table found',
          allTables
        });
      }
      
      // If only vehicledetail exists, no migration needed
      if (!hasVehicledetails && hasVehicledetail) {
        return res.status(200).json({
          success: true,
          message: 'Table already named vehicledetail - no migration needed',
          allTables
        });
      }
      
      // If vehicledetails exists, run migration
      if (hasVehicledetails) {
        console.log('[Migration] Dropping foreign key constraint...');
        try {
          await client.query(`
            ALTER TABLE invoicemaster
            DROP CONSTRAINT IF EXISTS invoicemaster_vehicleid_fkey;
          `);
          console.log('[Migration] ✓ Foreign key dropped');
        } catch (fkErr) {
          console.log('[Migration] FK drop note:', fkErr.message);
        }
        
        console.log('[Migration] Renaming table...');
        await client.query(`
          ALTER TABLE vehicledetails RENAME TO vehicledetail;
        `);
        console.log('[Migration] ✓ Table renamed');
        
        console.log('[Migration] Recreating foreign key...');
        await client.query(`
          ALTER TABLE invoicemaster
          ADD CONSTRAINT invoicemaster_vehicleid_fkey
          FOREIGN KEY (vehicleid) REFERENCES vehicledetail(vehicleid);
        `);
        console.log('[Migration] ✓ Foreign key recreated');
        
        const countRes = await client.query('SELECT COUNT(*) as count FROM vehicledetail');
        
        return res.status(200).json({
          success: true,
          message: 'Migration completed successfully',
          data: {
            action: 'renamed vehicledetails to vehicledetail',
            vehicleCount: parseInt(countRes.rows[0].count)
          }
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Migration Endpoint ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// Debug endpoint to show available routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        route: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ').toUpperCase()
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        const route = handler.route;
        if (route) {
          routes.push({
            route: route.path,
            methods: Object.keys(route.methods).join(', ').toUpperCase()
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Debug endpoint to check database tables and data
app.get('/debug/database', async (req, res) => {
  try {
    const pool = require('./config/db');
    
    // Check what tables exist
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('[Debug] Tables in database:', tables);
    
    // Determine which vehicle table exists
    const vehicleTableName = tables.includes('vehicledetail') ? 'vehicledetail' : 'vehicledetails';
    console.log('[Debug] Using vehicle table:', vehicleTableName);
    
    // Check data in key tables
    const data = {};
    
    for (const table of ['customermaster', vehicleTableName, 'invoicemaster']) {
      try {
        if (tables.includes(table)) {
          const countRes = await pool.query(`SELECT COUNT(*) as count FROM ${table} WHERE deletedat IS NULL`);
          data[table] = {
            exists: true,
            count: countRes.rows[0].count,
            sample: null
          };
          
          const sampleRes = await pool.query(`SELECT * FROM ${table} WHERE deletedat IS NULL LIMIT 1`);
          if (sampleRes.rows.length > 0) {
            data[table].sample = sampleRes.rows[0];
          }
        } else {
          data[table] = { exists: false };
        }
      } catch (tableErr) {
        console.error(`[Debug] Error querying ${table}:`, tableErr.message);
        data[table] = { exists: false, error: tableErr.message };
      }
    }
    
    res.json({ 
      tables, 
      data,
      vehicleTableInUse: vehicleTableName,
      migration: {
        completed: tables.includes('vehicledetail'),
        message: tables.includes('vehicledetail') ? '✓ Table correctly named vehicledetail' : 'ℹ Table named vehicledetails - run POST /admin/migrate/rename-vehicledetails'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// Database initialization
async function initializeDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database, checking tables...');
    
    const res = await client.query("SELECT to_regclass('public.invoicemaster');");
    
    if (res.rows[0].to_regclass === null) {
      console.log('Tables not found, running migration...');
      
      // Try multiple possible paths for schema.sql
      const possiblePaths = [
        path.join(__dirname, '../database/schema-simple.sql'),
        path.join(__dirname, '../database/schema.sql'),
        path.join(__dirname, '../../database/schema-simple.sql'),
        path.join(__dirname, '../../database/schema.sql'),
        '/opt/render/project/src/database/schema-simple.sql',
        '/opt/render/project/src/database/schema.sql',
        '/opt/render/project/database/schema-simple.sql',
        '/opt/render/project/database/schema.sql'
      ];
      
      let schemaPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          schemaPath = p;
          console.log('Found schema at:', p);
          break;
        }
      }
      
      if (schemaPath) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        const migrationClient = await pool.connect();
        try {
          await migrationClient.query(schema);
          console.log('✓ Database migration completed successfully!');
        } catch (migrationErr) {
          console.error('Migration error:', migrationErr.message);
        } finally {
          migrationClient.release();
        }
      } else {
        console.warn('Schema file not found at any expected path');
      }
    } else {
      console.log('✓ Database tables already exist');
    }
    
    // Step 2: Check if vehicledetails table needs to be renamed to vehicledetail
    console.log('[Startup] Checking if vehicledetails needs to be renamed to vehicledetail...');
    try {
      const tableCheckRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'vehicledetails' AND table_schema = 'public'
      `);
      
      if (tableCheckRes.rows.length > 0) {
        console.log('[Startup] Found vehicledetails table - executing rename migration...');
        
        try {
          // Drop foreign key
          await client.query(`
            ALTER TABLE invoicemaster
            DROP CONSTRAINT IF EXISTS invoicemaster_vehicleid_fkey
          `);
          console.log('[Startup] ✓ Dropped foreign key constraint');
          
          // Rename table
          await client.query(`
            ALTER TABLE vehicledetails
            RENAME TO vehicledetail
          `);
          console.log('[Startup] ✓ Renamed vehicledetails to vehicledetail');
          
          // Recreate foreign key
          await client.query(`
            ALTER TABLE invoicemaster
            ADD CONSTRAINT invoicemaster_vehicleid_fkey
            FOREIGN KEY (vehicleid) REFERENCES vehicledetail(vehicleid)
          `);
          console.log('[Startup] ✓ Recreated foreign key constraint');
          console.log('[Startup] ✅ Table rename migration completed successfully!');
        } catch (renameErr) {
          console.error('[Startup] Rename migration error:', renameErr.message);
          // Don't fail startup, just log the error
        }
      } else {
        console.log('[Startup] ✓ vehicledetail table naming is correct');
      }
    } catch (checkErr) {
      console.error('[Startup] Table check error:', checkErr.message);
    }
    
    client.release();
  } catch (err) {
    console.error('Database connection error:', err.message);
  } finally {
    await pool.end();
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDatabase();
});
