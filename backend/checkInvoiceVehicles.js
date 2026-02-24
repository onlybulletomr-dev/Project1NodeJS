const pool = require('./config/db');

async function checkInvoices() {
  try {
    console.log('========================================');
    console.log('INVOICE VEHICLE ID CHECK');
    console.log('========================================\n');

    const result = await pool.query(`
      SELECT invoiceid, totalamount, vehicleid, paymentstatus, invoicenumber
      FROM invoicemaster 
      WHERE deletedat IS NULL 
      ORDER BY invoiceid DESC 
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} invoices:\n`);
    result.rows.forEach(row => {
      const vehicleText = row.vehicleid ? `✓ Vehicle ${row.vehicleid}` : '✗ NULL vehicleid';
      console.log(`  Invoice ${row.invoiceid}: ₹${row.totalamount} | ${vehicleText} | Status: ${row.paymentstatus}`);
    });

    console.log('\n========================================');
    console.log('VEHICLE RECORDS IN DATABASE');
    console.log('========================================\n');

    const vehicles = await pool.query(`
      SELECT vehicledetailid, vehiclenumber FROM vehicledetail 
      WHERE deletedat IS NULL 
      LIMIT 10
    `);

    console.log(`Found ${vehicles.rows.length} vehicles:\n`);
    vehicles.rows.forEach(row => {
      console.log(`  Vehicle ID ${row.vehicledetailid}: ${row.vehiclenumber}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoices();
