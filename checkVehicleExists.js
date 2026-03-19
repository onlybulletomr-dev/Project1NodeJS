const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Checking vehicledetail table structure ===\n');
    
    // First check what columns exist
    const columnResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicledetail' ORDER BY column_name`
    );
    
    console.log('vehicledetail columns:', columnResult.rows.map(r => r.column_name).join(', '));
    
    console.log('\n=== Checking if these vehicles exist ===\n');
    
    // Check if these vehicles exist in vehicledetail
    const vehicles = ['TN 45 AY 0676', 'TN AB 45 1234', 'TNTEST3133'];
    
    for (const vehicleNum of vehicles) {
      const result = await pool.query(
        "SELECT vehicledetailid, vehiclenumber FROM vehicledetail WHERE vehiclenumber = $1 LIMIT 1",
        [vehicleNum]
      );
      
      if (result.rows.length > 0) {
        console.log(`✓ Found: ${vehicleNum}`);
        console.log(`  vehicledetailid: ${result.rows[0].vehicledetailid}`);
      } else {
        console.log(`✗ NOT FOUND in vehicledetail: ${vehicleNum}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
