const pool = require('./config/db');

async function testData() {
  try {
    console.log('=== Checking Vehicle Data ===');
    const vehiclesResult = await pool.query('SELECT vehicledetailid, vehiclenumber FROM vehicledetail;');
    console.log('Available Vehicle IDs:', vehiclesResult.rows.map(v => v.vehicledetailid).join(', '));
    console.log('Vehicles:', JSON.stringify(vehiclesResult.rows, null, 2));

    console.log('\n=== Checking Invoice Data with vehicleid ===');
    const invoicesResult = await pool.query(`
      SELECT invoiceid, invoicenumber, vehicleid, totalamount, paymentstatus 
      FROM invoicemaster 
      LIMIT 10;
    `);
    console.log('Invoices:', JSON.stringify(invoicesResult.rows, null, 2));

    console.log('\n=== Checking Mismatch: vehicles in invoices that dont exist in vehicledetail ===');
    const mismatchResult = await pool.query(`
      SELECT DISTINCT im.vehicleid FROM invoicemaster im
      WHERE im.vehicleid IS NOT NULL 
      AND im.vehicleid NOT IN (SELECT vehicledetailid FROM vehicledetail)
      LIMIT 10;
    `);
    console.log('Mismatched Vehicle IDs:', mismatchResult.rows);

    console.log('\n=== Checking PaymentDetail Data ===');
    const paymentsResult = await pool.query('SELECT * FROM paymentdetail;');
    console.log('Payment Details:', JSON.stringify(paymentsResult.rows, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testData();
