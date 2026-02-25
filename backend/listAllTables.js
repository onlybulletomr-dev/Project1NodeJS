const db = require('./config/db');

console.log('Listing all tables in database...\n');

db.query(
  `SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name`,
  (err, res) => {
    if (err) {
      console.error('Error:', err.message);
      db.end();
      return;
    }
    
    console.log('Tables found:');
    res.rows.forEach(r => console.log('  ' + r.table_name));
    
    // Check for any table with "vehicle" in name
    console.log('\nTables with "vehicle" in name:');
    const vehicleTables = res.rows.filter(r => r.table_name.includes('vehicle'));
    vehicleTables.forEach(r => console.log('  ' + r.table_name));
    
    db.end();
  }
);
