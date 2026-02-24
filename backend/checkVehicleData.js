const pool = require('./config/db');

async function checkVehicleData() {
  try {
    console.log('\n=== VEHICLEDETAILS DATA ===');
    const vehicleRes = await pool.query(`
      SELECT vd.vehicledetailid, vd.vehiclenumber, vd.vehiclecolor, vd.vehiclemodel
      FROM vehicledetail vd
      LIMIT 5
    `);
    console.log(JSON.stringify(vehicleRes.rows, null, 2));

    console.log('\n=== ALL CUSTOMERS ===');
    const custRes = await pool.query(
      'SELECT customerid, firstname, lastname, mobilenumber1 FROM customermaster'
    );
    console.log(JSON.stringify(custRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkVehicleData();
