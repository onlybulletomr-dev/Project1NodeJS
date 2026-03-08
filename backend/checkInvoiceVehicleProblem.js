const pool = require('./config/db');

(async () => {
  try {
    // Check schema
    const schema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoicemaster'
      ORDER BY ordinal_position
      LIMIT 10
    `);
    console.log('=== InvoiceMaster columns ===');
    schema.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    
    // Get invoices with vehicleid=1
    const invoices = await pool.query(`
      SELECT invoiceid, invoicenumber, vehicleid, customerid 
      FROM invoicemaster 
      WHERE vehicleid = 1 
      LIMIT 3
    `);
    
    console.log('\n=== Invoices with vehicleid=1 ===');
    invoices.rows.forEach(inv => {
      console.log(`${inv.invoicenumber}: vehicleid=${inv.vehicleid}, customerid=${inv.customerid}`);
    });
    
    // Check if this customer has any valid vehicles
    if (invoices.rows.length > 0) {
      const custId = invoices.rows[0].customerid;
      const vehicles = await pool.query(`
        SELECT vehicledetailid, vehiclenumber 
        FROM vehicledetail 
        WHERE customerid = $1
      `, [custId]);
      
      console.log(`\n=== Vehicles for customer ${custId} ===`);
      if (vehicles.rows.length > 0) {
        vehicles.rows.forEach(v => console.log(`${v.vehicledetailid}: ${v.vehiclenumber}`));
      } else {
        console.log('No vehicles found for this customer');
      }
    }
    
    process.exit(0);
  } catch(err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
