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
    const vehicles = await renderPool.query('SELECT vehicleid, customerid, registrationnumber FROM vehicledetail ORDER BY vehicleid');
    console.log('\n=== Vehicle-Customer Mapping ===');
    vehicles.rows.forEach(v => console.log(`  Vehicle ${v.vehicleid}: ${v.registrationnumber} -> Customer ${v.customerid}`));
    renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    renderPool.end();
  }
})();
