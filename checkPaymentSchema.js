const pool = require('./backend/config/db');

async function check() {
  try {
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'paymentdetail'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== PAYMENTDETAIL COLUMNS ===\n');
    columns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

check();
