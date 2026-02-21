const pool = require('./config/db');

async function updateInvoiceData() {
  try {
    // Update invoicemaster with correct data
    console.log('Updating invoice records with valid customer IDs and vehicle numbers...\n');

    const updates = [
      { invoiceid: 17, vehiclenumber: 'DL01AB1234', customerid: 6 },
      { invoiceid: 18, vehiclenumber: 'MH02CD5678', customerid: 7 },
      { invoiceid: 24, vehiclenumber: 'KA03EF9012', customerid: 8 },
    ];

    for (const update of updates) {
      await pool.query(
        `UPDATE invoicemaster SET vehiclenumber = $1, customerid = $2 WHERE invoiceid = $3`,
        [update.vehiclenumber, update.customerid, update.invoiceid]
      );
      console.log(`Updated invoice ${update.invoiceid}: vehicle=${update.vehiclenumber}, customer=${update.customerid}`);
    }

    // Verify the updates
    console.log('\n=== UPDATED DATA ===');
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

    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateInvoiceData();
