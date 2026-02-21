const pool = require('./config/db');

pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'", (err, res) => {
  if(err) {
    console.log('Error:', err.message);
  } else {
    console.log('Tables in database:');
    res.rows.forEach(r => console.log('  ' + r.tablename));
  }
  process.exit(0);
});
