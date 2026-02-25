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
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoicemaster' ORDER BY ordinal_position"
    );
    console.log('\n=== Columns in invoicemaster table ===');
    res.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
    
    const sample = await pool.query("SELECT * FROM invoicemaster WHERE deletedat IS NULL LIMIT 1");
    if (sample.rows.length > 0) {
      console.log('\nSample invoice data:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
})();
