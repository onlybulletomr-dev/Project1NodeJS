const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function clearRenderDatabase() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          CLEARING RENDER DATABASE - PREPARING FOR RESET         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get all tables
    const tables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const tableNames = tables.rows.map(r => r.table_name);
    console.log(`Found ${tableNames.length} tables to clear:\n`);

    // Drop tables with cascade to remove foreign keys
    for (const table of tableNames) {
      try {
        await renderPool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`✅ Dropped: ${table}`);
      } catch (err) {
        console.log(`⚠️  Error dropping ${table}:`, err.message);
      }
    }

    console.log(`\n✅ Database cleared! Ready for schema recreation.\n`);
    await renderPool.end();
  } catch (err) {
    console.error('Fatal error:', err.message);
    await renderPool.end();
  }
}

clearRenderDatabase();
