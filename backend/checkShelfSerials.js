const pool = require('./config/db');

pool.query(`SELECT COUNT(*) FROM serialnumber WHERE status = 'SHELF'`, (err, res) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Total SHELF serials:', res.rows[0].count);
  }
  process.exit();
});
