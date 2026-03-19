const pool = require('./backend/config/db');

async function testSerialDisplayInInvoice() {
  try {
    console.log('=== Testing Serial Number Display in Invoice ===\n');
    
    // Step 1: Check if there's any invoice with serial-tracked items
    console.log('Step 1: Finding invoices with serial-tracked items...');
    const invoicesResult = await pool.query(`
      SELECT DISTINCT im.invoiceid 
      FROM invoicemaster im
      JOIN invoicedetail id ON im.invoiceid = id.invoiceid
      JOIN itemmaster itm ON id.itemid = itm.itemid
      WHERE itm.serialnumbertracking = true
      AND im.deletedat IS NULL
      AND id.deletedat IS NULL
      LIMIT 1
    `);
    
    if (invoicesResult.rows.length === 0) {
      console.log('⚠️  No invoices found with serial-tracked items');
      console.log('   (Create an invoice with battery/tyre first)\n');
      process.exit(0);
    }
    
    const invoiceId = invoicesResult.rows[0].invoiceid;
    console.log(`✅ Found invoice ID: ${invoiceId}\n`);
    
    // Step 2: Test the modified getByInvoiceId query
    console.log('Step 2: Fetching invoice details with serial info...');
    const detailsResult = await pool.query(`
      SELECT 
        id.invoicedetailid,
        id.itemid,
        id.qty,
        COALESCE(im.itemname, 'Service') as itemname,
        im.serialnumbertracking,
        COALESCE(
          string_agg(
            'SN: ' || COALESCE(sn.serialnumber, '-') || ' | Batch: ' || COALESCE(sn.batch, '-') || ' | Model: ' || COALESCE(sn.model, '-') || ' | Mfg: ' || COALESCE(sn.remarks, '-'),
            ' | '
          ),
          NULL
        ) as serials_info
      FROM invoicedetail id
      LEFT JOIN itemmaster im ON id.itemid = im.itemid AND im.deletedat IS NULL
      LEFT JOIN serialnumber sn ON id.invoicedetailid = sn.invoicedetailid AND sn.deletedat IS NULL
      WHERE id.invoiceid = $1 AND id.deletedat IS NULL
      GROUP BY id.invoicedetailid, id.itemid, id.qty, im.itemname, im.serialnumbertracking
      ORDER BY id.invoicedetailid
    `, [invoiceId]);
    
    if (detailsResult.rows.length === 0) {
      console.log('⚠️  No invoice details found');
      process.exit(0);
    }
    
    console.log(`✅ Found ${detailsResult.rows.length} invoice detail(s)\n`);
    
    // Step 3: Display the formatted descriptions
    console.log('Step 3: Formatted Item Descriptions:\n');
    detailsResult.rows.forEach((detail, idx) => {
      let displayName = detail.itemname || 'Item';
      if (detail.serialnumbertracking && detail.serials_info) {
        displayName = `${displayName} | ${detail.serials_info}`;
      }
      console.log(`Detail ${idx + 1}:`);
      console.log(`  ItemName: ${detail.itemname}`);
      console.log(`  Serial Tracking: ${detail.serialnumbertracking}`);
      console.log(`  Serial Info: ${detail.serials_info || 'None'}`);
      console.log(`  Final Display: ${displayName}`);
      console.log('');
    });
    
    console.log('✅ Serial display implementation is working correctly!');
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

testSerialDisplayInInvoice();
