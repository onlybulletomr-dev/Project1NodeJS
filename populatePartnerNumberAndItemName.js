const pool = require('./backend/config/db');

async function populatePartnerNumberAndItemName() {
  try {
    console.log('=== Populating partnumber and itemname in invoicedetail ===\n');

    // Update items from itemmaster
    console.log('Step 1: Populating from itemmaster...');
    const itemUpdateResult = await pool.query(`
      UPDATE invoicedetail
      SET 
        partnumber = im.partnumber,
        itemname = im.itemname
      FROM itemmaster im
      WHERE invoicedetail.itemid = im.itemid 
      AND im.deletedat IS NULL 
      AND invoicedetail.deletedat IS NULL
      AND invoicedetail.partnumber IS NULL
    `);
    
    console.log(`  ✅ Updated ${itemUpdateResult.rowCount} items from itemmaster`);

    // Update services from servicemaster
    console.log('\nStep 2: Populating from servicemaster...');
    const serviceUpdateResult = await pool.query(`
      UPDATE invoicedetail
      SET 
        partnumber = sm.servicenumber,
        itemname = sm.servicename
      FROM servicemaster sm
      WHERE invoicedetail.itemid = sm.serviceid 
      AND sm.deletedat IS NULL 
      AND invoicedetail.deletedat IS NULL
      AND invoicedetail.partnumber IS NULL
    `);
    
    console.log(`  ✅ Updated ${serviceUpdateResult.rowCount} services from servicemaster`);

    // Step 3: Check results
    console.log('\nStep 3: Verification:\n');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        SUM(CASE WHEN partnumber IS NOT NULL THEN 1 ELSE 0 END) as partnumber_filled,
        SUM(CASE WHEN itemname IS NOT NULL THEN 1 ELSE 0 END) as itemname_filled,
        SUM(CASE WHEN partnumber IS NULL THEN 1 ELSE 0 END) as partnumber_null,
        SUM(CASE WHEN itemname IS NULL THEN 1 ELSE 0 END) as itemname_null
      FROM invoicedetail
      WHERE deletedat IS NULL
    `);

    const stats = statsResult.rows[0];
    console.log(`Total Invoice Details: ${stats.total_rows}`);
    console.log(`✅ partnumber filled: ${stats.partnumber_filled} rows`);
    console.log(`✅ itemname filled: ${stats.itemname_filled} rows`);
    if (stats.partnumber_null > 0) {
      console.log(`⚠️  partnumber NULL: ${stats.partnumber_null} rows (items not in itemmaster)`);
    }
    if (stats.itemname_null > 0) {
      console.log(`⚠️  itemname NULL: ${stats.itemname_null} rows (items not in itemmaster)`);
    }

    // Step 4: Show samples
    console.log('\nStep 4: Sample data:\n');
    const sampleResult = await pool.query(`
      SELECT invoicedetailid, itemid, partnumber, itemname, qty, unitprice, linetotal
      FROM invoicedetail
      WHERE deletedat IS NULL
      ORDER BY invoicedetailid DESC
      LIMIT 5
    `);

    sampleResult.rows.forEach((row, idx) => {
      console.log(`Detail ${idx + 1}:`);
      console.log(`  ItemID: ${row.itemid}`);
      console.log(`  PartNumber: ${row.partnumber}`);
      console.log(`  ItemName: ${row.itemname}`);
      console.log(`  Qty: ${row.qty}, Price: ₹${row.unitprice}, Total: ₹${row.linetotal}`);
      console.log('');
    });

    console.log('✅ Denormalization complete!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

populatePartnerNumberAndItemName();
