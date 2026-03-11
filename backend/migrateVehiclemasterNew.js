const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Local database connection
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'project1',
});

// Render database connection
const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function migrateVehiclemasterTable() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║      VEHICLEMASTER TABLE MIGRATION                    ║');
    console.log('║      Local → Render Environment                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Check if Render credentials are provided
    if (!process.env.RENDER_DB_HOST) {
      console.log('❌ Render database credentials not set in environment.');
      console.log('Please set these environment variables:');
      console.log('  - RENDER_DB_HOST');
      console.log('  - RENDER_DB_USER');
      console.log('  - RENDER_DB_PASSWORD');
      console.log('  - RENDER_DB_NAME');
      console.log('\nYou can get these from your Render dashboard.');
      process.exit(1);
    }

    const localClient = await localPool.connect();
    const renderClient = await renderPool.connect();

    try {
      console.log('✓ Connected to both databases\n');

      // STEP 1: Get table structure from local database
      console.log('STEP 1: Fetching table structure from local database...');
      const structureResult = await localClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'vehiclemaster'
        ORDER BY ordinal_position
      `);

      if (structureResult.rows.length === 0) {
        console.log('❌ vehiclemaster table not found in local database');
        process.exit(1);
      }

      console.log(`✓ Found ${structureResult.rows.length} columns in local vehiclemaster\n`);

      // STEP 2: Create table in Render with the same structure
      console.log('STEP 2: Creating vehiclemaster table in Render...');
      const columns = structureResult.rows;
      
      // Drop table if exists
      try {
        await renderClient.query('DROP TABLE IF EXISTS vehiclemaster CASCADE');
      } catch (e) {
        console.log('  Note: Could not drop existing table (may not exist)');
      }
      
      const columnDefs = columns.map(col => {
        let def = `"${col.column_name}" ${col.data_type}`;
        if (col.is_nullable === 'NO' && col.column_name !== 'vehicleid') {
          def += ' NOT NULL';
        }
        // Only add defaults if they don't reference non-existent sequences
        if (col.column_default && !col.column_default.includes('nextval')) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      }).join(',\n  ');

      const createTableQuery = `CREATE TABLE vehiclemaster (
        ${columnDefs},
        PRIMARY KEY (vehicleid)
      )`;

      try {
        await renderClient.query(createTableQuery);
        console.log('✓ vehiclemaster table created in Render\n');
      } catch (createErr) {
        console.log('  Attempting alternative table creation...');
        const simpleColumnDefs = columns.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.column_name === 'vehicleid') {
            def = `"${col.column_name}" SERIAL PRIMARY KEY`;
          } else if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          return def;
        }).join(',\n  ');
        
        const simpleCreateQuery = `CREATE TABLE vehiclemaster (
          ${simpleColumnDefs}
        )`;
        
        await renderClient.query(simpleCreateQuery);
        console.log('✓ vehiclemaster table created in Render (simplified)\n');
      }

      // STEP 3: Fetch all records from local
      console.log('STEP 3: Fetching records from local database...');
      const recordsResult = await localClient.query('SELECT * FROM vehiclemaster');
      const records = recordsResult.rows;
      console.log(`✓ Found ${records.length} records in local vehiclemaster\n`);

      if (records.length === 0) {
        console.log('⚠️  No records to migrate');
        process.exit(0);
      }

      // STEP 4: Insert all records to Render
      console.log('STEP 4: Inserting records to Render...');
      const columnNames = columns.map(col => `"${col.column_name}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO vehiclemaster (${columnNames}) VALUES (${placeholders})`;

      let insertCount = 0;
      let skipCount = 0;

      for (const record of records) {
        try {
          const values = columns.map(col => record[col.column_name]);
          await renderClient.query(insertQuery, values);
          insertCount++;
          
          if (insertCount % 50 === 0) {
            console.log(`  ↳ ${insertCount} records inserted...`);
          }
        } catch (insertErr) {
          skipCount++;
          console.log(`  ⚠️  Skipped record ID ${record.vehicleid}: ${insertErr.message.substring(0, 80)}`);
        }
      }

      console.log(`\n✅ MIGRATION COMPLETE:\n`);
      console.log(`  ✓ Inserted: ${insertCount} records`);
      if (skipCount > 0) {
        console.log(`  ⚠️  Skipped: ${skipCount} records`);
      }

      // STEP 5: Verify migration
      console.log('\nSTEP 5: Verifying migration...');
      const verifyResult = await renderClient.query('SELECT COUNT(*) as count FROM vehiclemaster');
      const countResult = await renderClient.query(
        'SELECT column_name FROM information_schema.columns WHERE table_name = \'vehiclemaster\''
      );

      console.log(`✓ Render vehiclemaster now contains: ${verifyResult.rows[0].count} records`);
      console.log(`✓ Table has ${countResult.rows.length} columns`);
      
      // Show sample of migrated data
      const sampleResult = await renderClient.query(
        'SELECT vehicleid, modelname, manufacturername FROM vehiclemaster LIMIT 5'
      );
      console.log('\nSample migrated records:');
      sampleResult.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ID: ${row.vehicleid}, Model: ${row.modelname}, Manufacturer: ${row.manufacturername}`);
      });

      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║  ✅ VEHICLEMASTER MIGRATION SUCCESSFUL!               ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');

      process.exit(0);
    } catch (err) {
      console.error('\n❌ Migration error:', err.message);
      process.exit(1);
    } finally {
      await localClient.release();
      await renderClient.release();
      await localPool.end();
      await renderPool.end();
    }
  } catch (err) {
    console.error('\n❌ Connection error:', err.message);
    process.exit(1);
  }
}

migrateVehiclemasterTable();
