const pool = require('./config/db');

async function checkConstraints() {
  try {
    // Check vehicledetail table primary key and structure
    const pkResult = await pool.query(`
      SELECT column_name FROM information_schema.key_column_usage
      WHERE table_name = 'vehicledetail'
    `);
    console.log('VehicleDetail key columns:');
    console.log(pkResult.rows);

    // Get sample vehicledetailid values
    const sampleResult = await pool.query(`
      SELECT vehicledetailid FROM vehicledetail LIMIT 5
    `);
    console.log('\nSample vehicledetailid values:');
    console.log(sampleResult.rows);

    // Check invoice vehicleids
    const invoiceResult = await pool.query(`
      SELECT DISTINCT vehicleid FROM invoicemaster 
      WHERE deletedat IS NULL ORDER BY vehicleid
    `);
    console.log('\nInvoice vehicleids:');
    console.log(invoiceResult.rows);

    // Check if there's a vehicle table (not vehicledetail)
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'vehicle'
      ) as has_vehicle_table
    `);
    console.log('\nHas vehicle table:', tableResult.rows[0]);

  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkConstraints();
