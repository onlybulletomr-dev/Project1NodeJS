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

async function migrateServicemaster() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║      SERVICEMASTER TABLE MIGRATION                    ║');
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
        WHERE table_name = 'servicemaster'
        ORDER BY ordinal_position
      `);

      if (structureResult.rows.length === 0) {
        console.log('❌ servicemaster table not found in local database');
        process.exit(1);
      }

      console.log(`✓ Found ${structureResult.rows.length} columns in local servicemaster\n`);

      // STEP 2: Create table in Render with the same structure
      console.log('STEP 2: Creating servicemaster table in Render...');
      const columns = structureResult.rows;
      
      // Drop table if exists
      try {
        await renderClient.query('DROP TABLE IF EXISTS servicemaster CASCADE');
      } catch (e) {
        console.log('  Note: Could not drop existing table (may not exist)');
      }
      
      const columnDefs = columns.map(col => {
        let def = `"${col.column_name}" ${col.data_type}`;
        if (col.is_nullable === 'NO' && col.column_name !== 'serviceid') {
          def += ' NOT NULL';
        }
        // Only add defaults if they don't reference non-existent sequences
        if (col.column_default && !col.column_default.includes('nextval')) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      }).join(',\n  ');

      const createTableQuery = `CREATE TABLE servicemaster (
        ${columnDefs},
        PRIMARY KEY (serviceid)
      )`;

      try {
        await renderClient.query(createTableQuery);
        console.log('✓ servicemaster table created in Render\n');
      } catch (createErr) {
        console.log('  Attempting alternative table creation...');
        const simpleColumnDefs = columns.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.column_name === 'serviceid') {
            def = `"${col.column_name}" SERIAL PRIMARY KEY`;
          } else if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          return def;
        }).join(',\n  ');
        
        const simpleCreateQuery = `CREATE TABLE servicemaster (
          ${simpleColumnDefs}
        )`;
        
        await renderClient.query(simpleCreateQuery);
        console.log('✓ servicemaster table created in Render (simplified)\n');
      }

      // STEP 3: Fetch all records from local
      console.log('STEP 3: Fetching records from local database...');
      const recordsResult = await localClient.query('SELECT * FROM servicemaster');
      const records = recordsResult.rows;
      console.log(`✓ Found ${records.length} records in local servicemaster\n`);

      if (records.length === 0) {
        console.log('⚠️  No records to migrate');
        process.exit(0);
      }

      // STEP 4: Insert all records to Render
      console.log('STEP 4: Inserting records to Render...');
      const columnNames = columns.map(col => `"${col.column_name}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO servicemaster (${columnNames}) VALUES (${placeholders})`;

      let insertCount = 0;
      let skipCount = 0;

      for (const record of records) {
        try {
          const values = columns.map(col => record[col.column_name]);
          await renderClient.query(insertQuery, values);
          insertCount++;
          
          if (insertCount % 20 === 0) {
            console.log(`  ↳ ${insertCount} records inserted...`);
          }
        } catch (insertErr) {
          skipCount++;
          console.log(`  ⚠️  Skipped record: ${insertErr.message.substring(0, 80)}`);
        }
      }

      console.log(`\n✅ MIGRATION COMPLETE:\n`);
      console.log(`  ✓ Inserted: ${insertCount} records`);
      if (skipCount > 0) {
        console.log(`  ⚠️  Skipped: ${skipCount} records`);
      }

      // STEP 5: Verify migration
      console.log('\nSTEP 5: Verifying migration...');
      const verifyResult = await renderClient.query('SELECT COUNT(*) as count FROM servicemaster');
      const countResult = await renderClient.query(
        'SELECT column_name FROM information_schema.columns WHERE table_name = \'servicemaster\''
      );

      console.log(`✓ Render servicemaster now contains: ${verifyResult.rows[0].count} records`);
      console.log(`✓ Table has ${countResult.rows.length} columns`);
      console.log('\nColumns in Render servicemaster:');
      countResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}`);
      });

      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║  ✅ SERVICEMASTER MIGRATION SUCCESSFUL!               ║');
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

migrateServicemaster();
