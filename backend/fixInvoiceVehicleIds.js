const pool = require('./config/db');

async function fixInvoiceVehicleIds() {
  try {
    console.log('========================================');
    console.log('FIXING INVOICE VEHICLE IDS');
    console.log('========================================\n');

    // Get all invoices with vehicleid = 1 and their vehicle numbers
    const invoicesQuery = `
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.vehiclenumber,
        im.customerid,
        vd.vehicledetailid
      FROM invoicemaster im
      LEFT JOIN vehicledetail vd ON im.vehiclenumber = vd.vehiclenumber AND vd.deletedat IS NULL
      WHERE im.vehicleid = 1 AND im.deletedat IS NULL
      ORDER BY im.invoiceid
    `;
    
    const invoicesResult = await pool.query(invoicesQuery);
    console.log(`Found ${invoicesResult.rows.length} invoices with vehicleid = 1\n`);
    
    if (invoicesResult.rows.length === 0) {
      console.log('No invoices to fix.');
      await pool.end();
      return;
    }
    
    // Update each invoice with the correct vehicle ID
    let fixedCount = 0;
    let unfixedCount = 0;
    
    for (const invoice of invoicesResult.rows) {
      if (invoice.vehicledetailid) {
        // Update invoice with correct vehicledetailid
        const updateQuery = `
          UPDATE invoicemaster 
          SET vehicleid = $1
          WHERE invoiceid = $2
        `;
        await pool.query(updateQuery, [invoice.vehicledetailid, invoice.invoiceid]);
        console.log(`✓ Updated invoice ${invoice.invoicenumber} - vehicleid: ${invoice.vehicledetailid}`);
        fixedCount++;
      } else {
        console.log(`✗ Could not find vehicle for invoice ${invoice.invoicenumber} (VehicleNumber: ${invoice.vehiclenumber})`);
        unfixedCount++;
      }
    }
    
    console.log(`\n========================================`);
    console.log(`Fix complete!`);
    console.log(`Fixed invoices: ${fixedCount}`);
    console.log(`Unfixed invoices: ${unfixedCount}`);
    console.log('========================================\n');
    
    await pool.end();
    
  } catch (error) {
    console.error('Error fixing invoice vehicle IDs:', error);
    await pool.end();
  }
}

fixInvoiceVehicleIds();
