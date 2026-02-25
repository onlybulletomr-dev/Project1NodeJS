const db = require('./config/db');

console.log('Detailed vehiclemaster analysis...\n');

db.query(
  'SELECT vehicleid, modelname, manufacturername, deletedat FROM vehiclemaster ORDER BY modelname',
  (err, res) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('All vehiclemaster records:');
      res.rows.forEach((r, i) => {
        console.log(`  ${i+1}. ID: ${r.vehicleid}, Model: "${r.modelname}", Manufacturer: "${r.manufacturername}", Deleted: ${r.deletedat ? 'YES' : 'NO'}`);
      });
      
      console.log('\nUnique NON-DELETED models in vehiclemaster:');
      const unique = new Set();
      res.rows.forEach(r => {
        if (!r.deletedat && r.modelname) {
          unique.add(r.modelname);
        }
      });
      console.log('  Count:', unique.size);
      Array.from(unique).forEach(m => console.log(`    - ${m}`));
    }
    
    db.end();
  }
);
