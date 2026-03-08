const pool = require('./config/db');

(async () => {
  try {
    const results = await pool.query(`
      SELECT 
        i.invoiceid, i.invoicenumber, i.customernumber, i.vehicleid,
        c.customername,
        v.vehicledetailid, v.vehiclenumber
      FROM invoicemaster i
      LEFT JOIN customermaster c ON i.customernumber = c.customernumber
      LEFT JOIN vehicledetail v ON v.customernumber = i.customernumber
      WHERE i.vehicleid = 1
      LIMIT 3
    `);
    console.log('Invoices with vehicleid=1:');
    results.rows.forEach(row => {
      console.log(`\nInvoice: ${row.invoicenumber} (${row.invoiceid})`);
      console.log(`  Customer: ${row.customernumber} - ${row.customername}`);
      console.log(`  Invalid vehicleid: ${row.vehicleid}`);
      console.log(`  Available vehicle: ${row.vehicledetailid ? `${row.vehicledetailid} - ${row.vehiclenumber}` : 'NONE'}`);
    });
    process.exit(0);
  } catch(err) {
    console.error(err.message);
    process.exit(1);
  }
})();
