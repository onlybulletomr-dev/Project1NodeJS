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
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehicledetail' ORDER BY ordinal_position"
    );
    console.log('\n=== Columns in vehicledetail table ===');
    res.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
    
    // Also check one sample row
    const sampleRes = await pool.query('SELECT * FROM vehicledetail LIMIT 1');
    console.log('\nSample row data:');
    if (sampleRes.rows.length > 0) {
      console.log(JSON.stringify(sampleRes.rows[0], null, 2));
    } else {
      console.log('No data in table');
    }
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
})();
