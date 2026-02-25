const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const result = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    
    console.log(`\n✅ Render has ${result.rows.length} tables:\n`);
    result.rows.forEach((r, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${r.table_name}`);
    });
    
    await renderPool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
