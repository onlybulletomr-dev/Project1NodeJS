const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== CHECKING VEHICLEDETAIL TABLE ===\n');
    
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicledetail' AND table_schema = 'public' ORDER BY ordinal_position");
    console.log('VehicleDetail columns:');
    res.rows.forEach((r, i) => console.log(`${i+1}. ${r.column_name}`));
    
    // Also check what data exists for Branch 2
    console.log('\n--- Data in vehicledetail for Branch 2 ---');
    const dataRes = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 LIMIT 5', ['vehicledetail']);
    
    // Get sample data
    const sampleRes = await pool.query('SELECT * FROM vehicledetail WHERE branchid = 2 AND deletedat IS NULL LIMIT 1');
    if (sampleRes.rows.length > 0) {
      console.log('Sample record found');
      const record = sampleRes.rows[0];
      console.log('Keys:', Object.keys(record).slice(0, 10).join(', '));
    } else {
      console.log('No records found for Branch 2');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
