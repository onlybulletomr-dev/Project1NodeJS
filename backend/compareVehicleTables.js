const db = require('./config/db');

console.log('Checking vehiclemaster and vehicledetail tables...\n');

// Check vehiclemaster structure and data
db.query('SELECT * FROM vehiclemaster', (err, res) => {
  if (err) {
    console.error('Error querying vehiclemaster:', err.message);
  } else {
    console.log('vehiclemaster table:');
    console.log('  Records:', res.rows.length);
    console.log('  Columns:', Object.keys(res.rows[0] || {}));
    console.log('  Data:');
    res.rows.forEach(r => {
      console.log(`    ID: ${r.vehiclemasterid}, Model: ${r.model}, Manufacturer: ${r.manufacturer}, Year: ${r.yearmfg}`);
    });
  }
  
  // Check vehicledetail
  db.query('SELECT DISTINCT vehiclemodel FROM vehicledetail WHERE deletedat IS NULL ORDER BY vehiclemodel', (err2, res2) => {
    if (err2) {
      console.error('Error querying vehicledetail:', err2.message);
    } else {
      console.log('\nvehicledetail unique models:');
      console.log('  Records:', res2.rows.length);
      res2.rows.forEach(r => console.log(`    - ${r.vehiclemodel}`));
    }
    
    db.end();
  });
});
