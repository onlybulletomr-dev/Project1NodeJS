const pool = require('./config/db');

(async () => {
  try {
    // Find invoices with vehicleid=1
    const inv = await pool.query('SELECT invoiceid, invoicenumber, vehicleid FROM invoicemaster WHERE vehicleid=1 LIMIT 3');
    console.log('\n=== Invoices with vehicleid=1 ===');
    if (inv.rows.length) {
      inv.rows.forEach(r => console.log(r));
    } else {
      console.log('No invoices with vehicleid=1');
    }
    
    // Find first few valid vehicles
    const veh = await pool.query('SELECT vehicledetailid, vehiclenumber, customernumber FROM vehicledetail ORDER BY vehicledetailid LIMIT 3');
    console.log('\n=== Valid vehicles ===');
    veh.rows.forEach(r => console.log(r));
    
    // Find invoices with invalid vehicleids
    const badInvoices = await pool.query(`
      SELECT i.invoiceid, i.invoicenumber, i.vehicleid 
      FROM invoicemaster i 
      WHERE NOT EXISTS (
        SELECT 1 FROM vehicledetail v WHERE v.vehicledetailid = i.vehicleid
      )
      LIMIT 5
    `);
    console.log('\n=== Invoices with invalid vehicleids ===');
    badInvoices.rows.forEach(r => console.log(`Invoice ${r.invoicenumber} has vehicleid=${r.vehicleid} which doesn't exist`));
    
    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
