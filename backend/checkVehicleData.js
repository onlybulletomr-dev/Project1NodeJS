const pool = require('./config/db');

async function checkVehicleData() {
  try {
    console.log('\n=== VEHICLEDETAILS DATA ===');
    const vehicleRes = await pool.query(`
      SELECT vd.vehiclemasterid, vd.registrationnumber, vd.color, vm.modelname, vm.manufacturername
      FROM vehicledetails vd
      LEFT JOIN vehiclemaster vm ON vd.vehiclemasterid = vm.vehicleid
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
