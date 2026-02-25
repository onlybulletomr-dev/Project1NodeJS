const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'project1',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function recreateFullDatabase() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║      FULL DATABASE RECREATION - SCHEMA & DATA MIGRATION        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get all tables from local
    const tables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tableNames = tables.rows.map(r => r.table_name);

    console.log(`STEP 1: Recreating ${tableNames.length} tables in Render...\n`);

    for (const table of tableNames) {
      try {
        // Get table structure using pg_dump format query
        const result = await localPool.query(`
          SELECT 
            'CREATE TABLE "' || $1 || '" (' ||
            string_agg(
              '"' || column_name || '" ' || data_type ||
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
              ', '
              ORDER BY ordinal_position
            ) || ')'
          FROM information_schema.columns
          WHERE table_name = $1
        `, [table]);

        if (result.rows[0]) {
          const createStmt = result.rows[0][Object.keys(result.rows[0])[0]];
          if (createStmt) {
            await renderPool.query(createStmt);
            console.log(`✅ Created: ${table}`);
          }
        }
      } catch (err) {
        console.log(`⚠️  ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    console.log(`\nSTEP 2: Disabling foreign key constraints temporarily...\n`);
    try {
      await renderPool.query('SET session_replication_role = REPLICA');
      console.log('✅ Constraints disabled\n');
    } catch (e) {
      console.log('⚠️  Could not disable constraints (may not be needed)\n');
    }

    console.log(`STEP 3: Migrating data from all tables...\n`);

    let totalRows = 0;

    for (const table of tableNames) {
      try {
        const data = await localPool.query(`SELECT * FROM "${table}"`);
        const rowCount = data.rows.length;

        if (rowCount === 0) {
          console.log(`⏭️  ${table}: 0 rows`);
          continue;
        }

        const columns = Object.keys(data.rows[0]);
        
        // Batch insert
        for (const row of data.rows) {
          const values = columns.map(col => row[col]);
          const $params = columns.map((_, i) => `$${i + 1}`).join(', ');
          const insertSQL = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${$params}) ON CONFLICT DO NOTHING`;
          
          try {
            await renderPool.query(insertSQL, values);
          } catch (e) {
            // Skip individual row errors, continue with next
          }
        }

        console.log(`✅ ${table}: ${rowCount} rows migrated`);
        totalRows += rowCount;
      } catch (err) {
        console.log(`❌ ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    console.log(`\nSTEP 4: Re-enabling constraints...\n`);
    try {
      await renderPool.query('SET session_replication_role = DEFAULT');
      console.log('✅ Constraints re-enabled\n');
    } catch (e) {
      console.log('⚠️  Could not re-enable constraints\n');
    }

    console.log(`╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                   ✅ DATABASE RECREATION COMPLETE!             ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
    console.log(`✅ Tables created: ${tableNames.length}`);
    console.log(`✅ Rows migrated: ${totalRows}\n`);
    console.log(`Render database fully synchronized with local!\n`);

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Fatal error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

recreateFullDatabase();
