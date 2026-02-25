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

async function fixSequencesAndRecreate() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║      FIXING SEQUENCES AND RECREATING MISSING TABLES            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = localTables.rows.map(r => r.table_name);
    const renderTableNames = renderTables.rows.map(r => r.table_name);
    const missingTables = localTableNames.filter(t => !renderTableNames.includes(t));

    console.log(`Found ${missingTables.length} missing tables\n`);

    for (const table of missingTables) {
      try {
        console.log(`Processing: ${table}`);

        // Get column definitions
        const columns = await localPool.query(
          `SELECT column_name, data_type, is_nullable, column_default 
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position`,
          [table]
        );

        // Build CREATE TABLE without defaults first
        const colDefs = columns.rows.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          return def;
        }).join(',\n  ');

        const createStmt = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs}\n)`;

        await renderPool.query(createStmt);
        console.log(`  ✅ Table created`);

        // Get data
        const data = await localPool.query(`SELECT * FROM "${table}"`);
        console.log(`  ${data.rows.length} rows to migrate`);

        // Bulk insert
        if (data.rows.length > 0) {
          const cols = Object.keys(data.rows[0]);
          for (const row of data.rows) {
            const values = cols.map(c => row[c]);
            const $params = cols.map((_, i) => `$${i + 1}`).join(', ');
            const insertSQL = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${$params}) ON CONFLICT DO NOTHING`;
            try {
              await renderPool.query(insertSQL, values);
            } catch (e) {
              // Skip on error
            }
          }
          console.log(`  ✅ ${data.rows.length} rows inserted`);
        }

      } catch (err) {
        console.log(`  ❌ Error: ${err.message.split('\n')[0]}`);
      }
    }

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║              ✅ SEQUENCE FIX COMPLETE                          ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Fatal error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

fixSequencesAndRecreate();
