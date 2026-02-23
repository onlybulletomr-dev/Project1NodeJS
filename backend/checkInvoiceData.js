const pool = require('./config/db');

async function checkInvoiceData() {
  try {
    // Check what's in invoicemaster
    console.log('\n=== INVOICEMASTER DATA ===');
    const invoiceRes = await pool.query(
      'SELECT invoiceid, invoicenumber, vehiclenumber, vehicleid, customerid FROM invoicemaster LIMIT 3'
    );
    console.log(JSON.stringify(invoiceRes.rows, null, 2));

    // Check if customermaster has data
    console.log('\n=== CUSTOMERMASTER DATA ===');
    const customerRes = await pool.query(
      'SELECT customerid, firstname, lastname, mobilenumber1 FROM customermaster LIMIT 3'
    );
    console.log(JSON.stringify(customerRes.rows, null, 2));

    // Test the JOIN
    console.log('\n=== TEST JOIN QUERY ===');
    const joinRes = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.vehiclenumber,
        im.customerid,
        cm.firstname || ' ' || cm.lastname AS customername,
        cm.mobilenumber1 AS phonenumber
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid
      WHERE im.paymentstatus = 'Unpaid'
      LIMIT 3
    `);
    console.log(JSON.stringify(joinRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkInvoiceData();
