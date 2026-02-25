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

(async () => {
  try {
    const res = await renderPool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehicledetail' ORDER BY ordinal_position"
    );
    console.log('\n=== Render vehicledetail columns ===');
    res.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
    renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    renderPool.end();
  }
})();
