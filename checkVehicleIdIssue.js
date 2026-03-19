const pool = require('./backend/config/db');

(async () => {
  try {
    // Find all invoices with their vehicle info
    const result = await pool.query(
      'SELECT DISTINCT vehicleid, vehiclenumber, COUNT(*) as invoice_count FROM invoicemaster WHERE deletedat IS NULL GROUP BY vehicleid, vehiclenumber ORDER BY vehicleid, vehiclenumber'
    );
    
    console.log('\n=== Vehicles to Invoice Mapping ===\n');
    result.rows.forEach(row => {
      console.log(`vehicleid: ${row.vehicleid}, vehiclenumber: ${row.vehiclenumber}, invoices: ${row.invoice_count}`);
    });
    
    // Check if any vehicleid appears multiple times
    const vehicleIdMap = {};
    result.rows.forEach(row => {
      if (!vehicleIdMap[row.vehicleid]) {
        vehicleIdMap[row.vehicleid] = [];
      }
      vehicleIdMap[row.vehicleid].push(row.vehiclenumber);
    });
    
    console.log('\n=== Duplicate vehicleids (PROBLEM) ===\n');
    let hasDuplicates = false;
    Object.entries(vehicleIdMap).forEach(([id, vehicles]) => {
      if (vehicles.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️  vehicleid ${id} has ${vehicles.length} different vehicle numbers:`);
        vehicles.forEach(v => console.log(`   - ${v}`));
      }
    });
    
    if (!hasDuplicates) {
      console.log('✅ No duplicate vehicleids found - all vehicles have unique IDs');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
