const pool = require('./config/db');

async function updateLastInvoice() {
  try {
    await pool.query(
      `UPDATE invoicemaster SET vehiclenumber = $1, customerid = $2 WHERE invoiceid = $3`,
      ['TN04GH3456', 9, 25]
    );
    
    console.log('Updated invoice 25 with vehicle=TN04GH3456, customer=9');

    // Verify all invoices
    const result = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.vehiclenumber,
        cm.firstname || ' ' || cm.lastname AS customername,
        cm.mobilenumber1 AS phonenumber,
        im.totalamount,
        im.paymentstatus
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid
      WHERE im.paymentstatus = 'Unpaid'
      ORDER BY im.invoiceid
    `);

    console.log('\n=== ALL UNPAID INVOICES ===');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateLastInvoice();
