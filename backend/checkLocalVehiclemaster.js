const db = require('./config/db');

console.log('LOCAL database analysis:\n');

db.query('SELECT COUNT(*) as cnt FROM vehiclemaster', (err, res) => {
  if (err) {
    console.error('vehiclemaster count error:', err.message);
    db.end();
    return;
  }
  console.log('vehiclemaster total rows:', res.rows[0].cnt);
  
  db.query(
    'SELECT DISTINCT modelname FROM vehiclemaster WHERE deletedat IS NULL ORDER BY modelname',
    (err2, res2) => {
      if (err2) {
        console.error('Error:', err2.message);
      } else {
        console.log('Unique models (NON-DELETED):', res2.rows.length);
        res2.rows.forEach(r => console.log('  - ' + r.modelname));
      }
      db.end();
    }
  );
});
