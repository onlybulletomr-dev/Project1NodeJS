const pool = require('./config/db');

async function queryVehicles() {
  try {
    const result = await pool.query(
      'SELECT vehicledetailid, customerid, vehiclenumber, vehiclemodel, vehiclecolor, createdby, createdat FROM vehicledetail ORDER BY vehicledetailid DESC LIMIT 10'
    );
    console.log('\n=== VEHICLE DETAILS ===');
    console.table(result.rows);
    console.log('\nTotal records:', result.rows.length);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

queryVehicles();
