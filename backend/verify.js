const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'Project1db',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    const local = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const render = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTables = local.rows.map(r => r.table_name);
    const renderTables = render.rows.map(r => r.table_name);

    console.log(`\n✅ Local:  ${localTables.length}/19 tables`);
    console.log(`✅ Render: ${renderTables.length}/19 tables\n`);

    if (localTables.length === renderTables.length && localTables.length === 19) {
      console.log('🎉 MIGRATION COMPLETE!\n');
      console.log('All 19 tables present in both databases.');
  
      // Quick data sample
      for (const table of ['companymaster', 'customermaster', 'invoicemaster']) {
        const count = await renderPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        console.log(`  • ${table}: ${count.rows[0].cnt} rows`);
      }
    } else {
      const missing = localTables.filter(t => !renderTables.includes(t));
      console.log('⚠️ Missing:', missing.join(', '));
    }

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

verify();
