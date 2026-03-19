const pool = require('./backend/config/db');

async function debugSerialData() {
  try {
    console.log('=== Debugging Serial Data ===\n');
    
    // Find the invoice from previous test
    const invoiceResult = await pool.query(`
      SELECT DISTINCT im.invoiceid 
      FROM invoicemaster im
      JOIN invoicedetail id ON im.invoiceid = id.invoiceid
      JOIN itemmaster itm ON id.itemid = itm.itemid
      WHERE itm.serialnumbertracking = true
      AND im.deletedat IS NULL
      AND id.deletedat IS NULL
      LIMIT 1
    `);
    
    if (invoiceResult.rows.length === 0) {
      console.log('No invoices with serial items');
      process.exit(0);
    }
    
    const invoiceId = invoiceResult.rows[0].invoiceid;
    console.log(`Invoice ID: ${invoiceId}\n`);
    
    // Get invoice details
    const detailsResult = await pool.query(`
      SELECT id.invoicedetailid, id.itemid, itm.itemname
      FROM invoicedetail id
      JOIN itemmaster itm ON id.itemid = itm.itemid
      WHERE id.invoiceid = $1 AND id.deletedat IS NULL
    `, [invoiceId]);
    
    console.log(`Invoice Details (${detailsResult.rows.length}):`);
    detailsResult.rows.forEach(detail => {
      console.log(`  - InvoiceDetailID: ${detail.invoicedetailid}, ItemID: ${detail.itemid}, ItemName: ${detail.itemname}`);
    });
    
    // Check serials for these items
    console.log('\nChecking Serial Numbers:');
    for (const detail of detailsResult.rows) {
      console.log(`\n  For InvoiceDetailID ${detail.invoicedetailid}:`);
      
      const serialsResult = await pool.query(`
        SELECT serialnumberid, itemid, serialnumber, batch, model, remarks, status, invoicedetailid
        FROM serialnumber
        WHERE itemid = $1 AND deletedat IS NULL
        ORDER BY createdat
      `, [detail.itemid]);
      
      if (serialsResult.rows.length === 0) {
        console.log('    - No serials recorded for this item');
      } else {
        console.log(`    - Found ${serialsResult.rows.length} serial(s):`);
        serialsResult.rows.forEach(serial => {
          console.log(`      ID: ${serial.serialnumberid}`);
          console.log(`        SN: ${serial.serialnumber}`);
          console.log(`        Batch: ${serial.batch || 'NULL'}`);
          console.log(`        Model: ${serial.model || 'NULL'}`);
          console.log(`        Remarks: ${serial.remarks || 'NULL'}`);
          console.log(`        Status: ${serial.status}`);
          console.log(`        InvoiceDetailID: ${serial.invoicedetailid || 'NULL'}`);
        });
      }
    }
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

debugSerialData();
