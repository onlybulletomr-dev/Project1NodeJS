const pool = require('./config/db');

async function listTables() {
  try {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );
    console.log('Tables in database:');
    res.rows.forEach(r => console.log('  -', r.table_name));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listTables();
