const pool = require('./config/db');

async function getColumns() {
  try {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'employeemaster'
       ORDER BY column_name`
    );
    console.log('Columns in employeemaster:');
    res.rows.forEach(r => console.log('  -', r.column_name));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

getColumns();
