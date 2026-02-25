const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { ensureCredentialsTableExists } = require('./migrations/init-credentials');

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
const serviceRoutes = require('./routes/serviceRoutes');
const roleManagementRoutes = require('./routes/roleManagementRoutes');

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
app.use('/api', serviceRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', vehicleDetailRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', seedRoutes);
app.use('/api/roles', roleManagementRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const pool = require('./config/db');
    const result = await pool.query('SELECT 1');
    res.status(200).json({ 
      message: 'Server is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Server running but database error',
      error: err.message
    });
  }
});

// Credentials diagnostic endpoint
app.get('/admin/health/credentials', async (req, res) => {
  try {
    console.log('[DIAGNOSTIC] Checking credentials table...');
    const pool = require('./config/db');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employeecredentials'
      ) as exists;
    `);
    
    let credCount = 0;
    let empCount = 0;
    
    if (tableExists.rows[0].exists) {
      const credResult = await pool.query('SELECT COUNT(*) as count FROM employeecredentials;');
      credCount = credResult.rows[0].count;
      
      const empResult = await pool.query('SELECT COUNT(*) as count FROM EmployeeMaster WHERE DeletedAt IS NULL;');
      empCount = empResult.rows[0].count;
    }
    
    res.status(200).json({
      success: true,
      credentials_table_exists: tableExists.rows[0].exists,
      credential_records: credCount,
      employee_records: empCount,
      action: credCount === 0 ? 'Run POST /admin/init/credentials to populate' : 'Ready for login'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Initialize credentials endpoint
app.post('/admin/init/credentials', async (req, res) => {
  try {
    console.log('[ADMIN] Initializing credentials table...');
    await ensureCredentialsTableExists();
    
    const pool = require('./config/db');
    const result = await pool.query('SELECT COUNT(*) as count FROM employeecredentials;');
    
    res.status(200).json({
      success: true,
      message: 'Credentials table initialized successfully',
      credential_records: parseInt(result.rows[0].count)
    });
  } catch (err) {
    console.error('[ADMIN] Initialization error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Diagnostic endpoint - check vehiclemaster data
app.get('/admin/check/vehiclemaster', async (req, res) => {
  try {
    const pool = require('./config/db');
    const client = await pool.connect();
    
    const result = await client.query(
      'SELECT COUNT(*) as total, COUNT(DISTINCT modelname) as unique_models FROM vehiclemaster WHERE deletedat IS NULL'
    );
    
    const modelsResult = await client.query(
      'SELECT modelname, COUNT(*) as color_count FROM vehiclemaster WHERE deletedat IS NULL GROUP BY modelname ORDER BY modelname'
    );
    
    await client.release();
    
    res.status(200).json({
      success: true,
      total_records: result.rows[0].total,
      unique_models: result.rows[0].unique_models,
      models: modelsResult.rows
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Migration endpoint - populate vehiclemaster from local
app.post('/admin/migrate/vehiclemaster', async (req, res) => {
  try {
    console.log('[Migration] Starting vehiclemaster data import...');
    const pool = require('./config/db');
    const client = await pool.connect();
    
    // Check if we're trying to populate from scratch (simulate local data)
    const existingCount = await client.query('SELECT COUNT(*) as cnt FROM vehiclemaster');
    const count = parseInt(existingCount.rows[0].cnt);
    
    if (count > 4) {
      return res.status(200).json({
        success: true,
        message: `vehiclemaster already has ${count} records`,
        count
      });
    }
    
    // Insert missing models that should be in vehiclemaster
    const missingModels = [
      { modelname: 'Classic 500', manufacturername: 'Royal Enfield', fueltype: 'Petrol', modelsegment: 'Cruiser', enginetype: 'Single Cylinder', color: 'Various' },
      { modelname: 'Classic 650', manufacturername: 'Royal Enfield', fueltype: 'Petrol', modelsegment: 'Cruiser', enginetype: 'Twin Cylinder', color: 'Various' },
      { modelname: 'Goan Classic 350', manufacturername: 'Royal Enfield', fueltype: 'Petrol', modelsegment: 'Cruiser', enginetype: 'Single Cylinder', color: 'Various' },
      { modelname: 'Machismo 500', manufacturername: 'Royal Enfield', fueltype: 'Petrol', modelsegment: 'Cruiser', enginetype: 'Twin Cylinder', color: 'Various' }
    ];
    
    let inserted = 0;
    for (const model of missingModels) {
      try {
        const insert = await client.query(
          `INSERT INTO vehiclemaster (modelname, manufacturername, fueltype, modelsegment, enginetype, color, createdby, createdat)
           VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
           ON CONFLICT DO NOTHING`,
          [model.modelname, model.manufacturername, model.fueltype, model.modelsegment, model.enginetype, model.color]
        );
        if (insert.rowCount && insert.rowCount > 0) {
          inserted++;
        }
      } catch (err) {
        console.log(`  Skipped ${model.modelname}: ${err.message.substring(0, 50)}`);
      }
    }
    
    await client.release();
    
    res.status(200).json({
      success: true,
      message: `vehiclemaster migration complete - inserted ${inserted} new models`,
      inserted
    });
    
  } catch (err) {
    console.error('[Migration Error]', err.message);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: err.message
    });
  }
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

// Endpoint to add customerid column to vehicledetail and populate from invoices
app.post('/admin/migrate/add-customerid', async (req, res) => {
  try {
    console.log('[Migration Endpoint] Adding customerid column to vehicledetail...');
    const pool = require('./config/db');
    const client = await pool.connect();
    
    try {
      // First, get table schema to identify correct column names
      const schemaResult = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='vehicledetail'
        ORDER BY ordinal_position
      `);
      
      const columns = schemaResult.rows.map(r => r.column_name);
      console.log('[Migration] vehicledetail columns:', columns);
      
      // Identify the primary key column (vehicleid or vehicledetailid)
      const pkColumn = columns.includes('vehicleid') ? 'vehicleid' : 
                       columns.includes('vehicledetailid') ? 'vehicledetailid' : 'vehicleid';
      
      // Check if customerid already exists
      const checkCol = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='vehicledetail' AND column_name='customerid'
      `);
      
      if (checkCol.rows.length === 0) {
        console.log('[Migration] Adding customerid column...');
        await client.query(`
          ALTER TABLE vehicledetail ADD COLUMN customerid INTEGER;
        `);
        console.log('[Migration] ✓ customerid column added');
      } else {
        console.log('[Migration] customerid column already exists');
      }
      
      // Get the foreign key column name for vehicledetail (might be vehicleid or vehicledetailid)
      const fkResult = await client.query(`
        SELECT column_name FROM information_schema.constraint_column_usage 
        WHERE table_name='invoicemaster' AND constraint_name LIKE '%vehicle%'
      `);
      
      // Populate customerid from invoicemaster
      console.log('[Migration] Populating customerid from invoicemaster...');
      // Use dynamic SQL to handle column name
      const updateQuery = `
        UPDATE vehicledetail vd
        SET customerid = im.customerid
        FROM invoicemaster im
        WHERE vd.${pkColumn} = im.vehicleid 
          AND vd.customerid IS NULL
          AND im.customerid IS NOT NULL
      `;
      console.log('[Migration] Update query:', updateQuery);
      const updateResult = await client.query(updateQuery);
      
      console.log(`[Migration] ✓ Updated ${updateResult.rowCount} records`);
      
      // Check for remaining vehicles without customerid
      const missingCount = await client.query(`
        SELECT COUNT(*) as count FROM vehicledetail 
        WHERE customerid IS NULL AND deletedat IS NULL
      `);
      
      // Get sample data
      const sampleQuery = `
        SELECT ${pkColumn} as vehicleid, registrationnumber, model, color, customerid
        FROM vehicledetail
        WHERE customerid IS NOT NULL AND deletedat IS NULL
        LIMIT 3
      `;
      const sample = await client.query(sampleQuery);
      
      return res.status(200).json({
        success: true,
        message: 'Migration completed successfully',
        data: {
          action: 'added customerid column to vehicledetail',
          pkColumn: pkColumn,
          recordsUpdated: updateResult.rowCount,
          recordsMissingCustomerId: parseInt(missingCount.rows[0].count),
          sampleData: sample.rows
        }
      });
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
    
    // Step 3: Ensure EmployeeCredentials table exists and is populated
    console.log('[Startup] Checking EmployeeCredentials table...');
    try {
      // Create table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS employeecredentials (
          credentialid SERIAL PRIMARY KEY,
          employeeid INTEGER NOT NULL REFERENCES employeemaster(employeeid) ON DELETE CASCADE,
          passwordhash VARCHAR(255) NOT NULL,
          lastpasswordchange DATE DEFAULT CURRENT_DATE,
          passwordattempts INTEGER DEFAULT 0,
          ispasswordexpired BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(employeeid)
        );
      `;
      
      await client.query(createTableQuery);
      console.log('[Startup] ✓ EmployeeCredentials table exists');
      
      // Create index if it doesn't exist
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employeecredentials_employeeid 
        ON employeecredentials(employeeid);
      `);
      console.log('[Startup] ✓ Index created');
      
      // Get all employees without credentials
      const employeesQuery = `
        SELECT em.employeeid, em.firstname 
        FROM employeemaster em
        LEFT JOIN employeecredentials ec ON em.employeeid = ec.employeeid
        WHERE ec.credentialid IS NULL
        AND em.deletedat IS NULL;
      `;
      
      const employeesResult = await client.query(employeesQuery);
      console.log(`[Startup] Found ${employeesResult.rows.length} employees without credentials`);
      
      if (employeesResult.rows.length > 0) {
        // Default password: "Default@123"
        const defaultPassword = 'Default@123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        for (const employee of employeesResult.rows) {
          await client.query(`
            INSERT INTO employeecredentials (employeeid, passwordhash)
            VALUES ($1, $2)
            ON CONFLICT (employeeid) DO NOTHING;
          `, [employee.employeeid, hashedPassword]);
          console.log(`[Startup] ✓ Created default credentials for ${employee.firstname}`);
        }
      }
      
      console.log('[Startup] ✅ EmployeeCredentials migration completed successfully!');
    } catch (credErr) {
      console.error('[Startup] Credentials table setup error:', credErr.message);
      console.error('[Startup] Stack:', credErr.stack);
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
