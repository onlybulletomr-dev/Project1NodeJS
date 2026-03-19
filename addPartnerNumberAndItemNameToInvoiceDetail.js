const pool = require('./backend/config/db');

async function addPartnerNumberAndItemNameToInvoiceDetail() {
  try {
    console.log('=== Adding partnumber and itemname columns to invoicedetail ===\n');

    // Step 1: Check if columns exist
    console.log('Step 1: Checking if columns exist...');
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoicedetail' 
      AND column_name IN ('partnumber', 'itemname')
    `);
    
    const existingColumns = new Set(checkResult.rows.map(row => row.column_name));
    
    if (existingColumns.has('partnumber') && existingColumns.has('itemname')) {
      console.log('✅ Both columns already exist\n');
      process.exit(0);
    }

    // Step 2: Add missing columns
    console.log('Step 2: Adding missing columns...');
    if (!existingColumns.has('partnumber')) {
      console.log('  - Adding partnumber column...');
      await pool.query(`
        ALTER TABLE invoicedetail 
        ADD COLUMN partnumber VARCHAR(100)
      `);
      console.log('    ✅ partnumber column added');
    }

    if (!existingColumns.has('itemname')) {
      console.log('  - Adding itemname column...');
      await pool.query(`
        ALTER TABLE invoicedetail 
        ADD COLUMN itemname VARCHAR(255)
      `);
      console.log('    ✅ itemname column added');
    }

    // Step 3: Populate columns for existing invoices
    console.log('\nStep 3: Populating columns for existing invoices...');
    const updateResult = await pool.query(`
      UPDATE invoicedetail
      SET 
        partnumber = COALESCE(im.partnumber, CAST(invoicedetail.itemid AS VARCHAR)),
        itemname = COALESCE(im.itemname, sm.servicename, CAST(invoicedetail.itemid AS VARCHAR))
      FROM itemmaster im
      LEFT JOIN servicemaster sm ON invoicedetail.itemid = sm.serviceid AND sm.deletedat IS NULL
      WHERE invoicedetail.itemid = im.itemid AND im.deletedat IS NULL AND invoicedetail.deletedat IS NULL
    `);
    
    console.log(`  ✅ Updated ${updateResult.rowCount} invoice detail rows`);

    // Step 4: Verify the data
    console.log('\nStep 4: Verifying populated data...');
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        SUM(CASE WHEN partnumber IS NOT NULL THEN 1 ELSE 0 END) as partnumber_filled,
        SUM(CASE WHEN itemname IS NOT NULL THEN 1 ELSE 0 END) as itemname_filled
      FROM invoicedetail
      WHERE deletedat IS NULL
    `);

    const stats = verifyResult.rows[0];
    console.log(`  Total Invoice Details: ${stats.total_rows}`);
    console.log(`  partnumber filled: ${stats.partnumber_filled} (${((stats.partnumber_filled / stats.total_rows) * 100).toFixed(1)}%)`);
    console.log(`  itemname filled: ${stats.itemname_filled} (${((stats.itemname_filled / stats.total_rows) * 100).toFixed(1)}%)`);

    // Step 5: Show sample data
    console.log('\nStep 5: Sample data:\n');
    const sampleResult = await pool.query(`
      SELECT invoicedetailid, itemid, partnumber, itemname, qty, unitprice, linetotal
      FROM invoicedetail
      WHERE deletedat IS NULL
      LIMIT 3
    `);

    sampleResult.rows.forEach((row, idx) => {
      console.log(`Detail ${idx + 1}:`);
      console.log(`  ItemID: ${row.itemid}`);
      console.log(`  PartNumber: ${row.partnumber}`);
      console.log(`  ItemName: ${row.itemname}`);
      console.log(`  Qty: ${row.qty}, UnitPrice: ${row.unitprice}, Total: ${row.linetotal}\n`);
    });

    console.log('✅ Denormalization complete!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

addPartnerNumberAndItemNameToInvoiceDetail();
