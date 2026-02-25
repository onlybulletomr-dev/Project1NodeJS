const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db'
});

(async () => {
  try {
    console.log('\n=== Local Database - Customer 51 Vehicles ===');
    const res = await pool.query('SELECT vehicledetailid, customerid, vehiclenumber, vehiclemodel FROM vehicledetail WHERE customerid = 51 AND deletedat IS NULL');
    console.log(`Found ${res.rows.length} vehicles:`);
    res.rows.forEach(v => console.log(`  [${v.vehicledetailid}] ${v.vehiclenumber} (${v.vehiclemodel})`));
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
})();
