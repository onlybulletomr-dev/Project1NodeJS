const db = require('./config/db');

console.log('Checking vehicledetail table schema...\n');

db.query(
  `SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'vehicledetail' ORDER BY ordinal_position`,
  (err, res) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('vehicledetail columns:');
      res.rows.forEach(r => console.log('  ' + r.column_name));
    }
    
    // Check sample data
    db.query('SELECT * FROM vehicledetail LIMIT 1', (err2, res2) => {
      if (!err2 && res2.rows.length > 0) {
        console.log('\nSample row keys:', Object.keys(res2.rows[0]));
      }
      
      // Check unique models
      db.query(
        `SELECT DISTINCT vehiclemodel FROM vehicledetail 
         WHERE deletedat IS NULL AND vehiclemodel IS NOT NULL`,
        (err3, res3) => {
          if (!err3) {
            console.log('\nUnique models found:', res3.rowCount);
            if (res3.rows.length > 0) {
              console.log('Sample models:', res3.rows.slice(0, 3).map(r => r.vehiclemodel));
            }
          }
          db.end();
        }
      );
    });
  }
);
