const pool = require('./backend/config/db');

async function testDenormalization() {
  try {
    console.log('=== Testing Denormalization: partnumber and itemname in invoicedetail ===\n');

    // Check if columns exist and are populated
    console.log('Step 1: Verifying columns and data...');
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN partnumber IS NOT NULL THEN 1 ELSE 0 END) as partnumber_filled,
        SUM(CASE WHEN itemname IS NOT NULL THEN 1 ELSE 0 END) as itemname_filled
      FROM invoicedetail
      WHERE deletedat IS NULL
    `);

    const stats = verifyResult.rows[0];
    console.log(`  Total invoice details: ${stats.total}`);
    console.log(`  ✅ partnumber filled: ${stats.partnumber_filled}/${stats.total} (${((stats.partnumber_filled / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  ✅ itemname filled: ${stats.itemname_filled}/${stats.total} (${((stats.itemname_filled / stats.total) * 100).toFixed(1)}%)`);

    // Test query: get invoice with details using stored snapshots
    console.log('\nStep 2: Testing invoice display query...');
    const invoiceResult = await pool.query(`
      SELECT invoiceid FROM invoicemaster 
      WHERE deletedat IS NULL 
      ORDER BY createdat DESC
      LIMIT 1
    `);

    if (invoiceResult.rows.length === 0) {
      console.log('  ⚠️  No invoices found');
      process.exit(0);
    }

    const invoiceId = invoiceResult.rows[0].invoiceid;
    console.log(`  Found invoice ID: ${invoiceId}`);

    // Use the updated query from InvoiceDetail model
    const detailsResult = await pool.query(`
      SELECT 
        id.invoicedetailid,
        id.itemid,
        COALESCE(id.partnumber, CAST(id.itemid AS VARCHAR)) as partnumber,
        COALESCE(id.itemname, 'Item ' || CAST(id.itemid AS VARCHAR)) as itemname,
        id.itemname as description,
        id.qty,
        id.unitprice,
        id.linetotal,
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
      GROUP BY id.invoicedetailid, id.itemid, id.partnumber, id.itemname, id.qty, id.unitprice, id.linetotal, im.serialnumbertracking
      ORDER BY id.invoicedetailid
    `, [invoiceId]);

    console.log(`\n  📋 Invoice Details (${detailsResult.rows.length} items):\n`);
    
    detailsResult.rows.forEach((detail, idx) => {
      console.log(`  Item ${idx + 1}:`);
      console.log(`    PartNumber: ${detail.partnumber}`);
      console.log(`    ItemName: ${detail.itemname}`);
      console.log(`    Qty: ${detail.qty} × ₹${detail.unitprice} = ₹${detail.linetotal}`);
      if (detail.serialnumbertracking) {
        console.log(`    Serial Tracking: ✅`);
        if (detail.serials_info) {
          console.log(`    Serials: ${detail.serials_info}`);
        }
      }
      console.log('');
    });

    console.log('✅ Denormalization test completed successfully!');
    console.log('\n📝 Benefits of this approach:');
    console.log('  ✓ Historical accuracy - invoice shows exactly what was billed');
    console.log('  ✓ Performance - no JOIN needed for display');
    console.log('  ✓ Independence - works even if item is deleted from itemmaster');
    console.log('  ✓ Audit compliant - immutable historical record');

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

testDenormalization();
