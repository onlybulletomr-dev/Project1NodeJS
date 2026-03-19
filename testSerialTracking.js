const pool = require('./backend/config/db');

(async () => {
  try {
    // Test 1: Check database directly
    const dbResult = await pool.query(
      `SELECT itemid, partnumber, itemname, serialnumbertracking, duplicateserialnumber, points
       FROM itemmaster 
       WHERE serialnumbertracking = TRUE AND deletedat IS NULL 
       ORDER BY partnumber`
    );
    
    console.log('\n=== DATABASE RESULT ===');
    console.log(`Found ${dbResult.rows.length} items with serial tracking enabled:`);
    console.log(JSON.stringify(dbResult.rows, null, 2));

    // Test 2: Check what the ItemMaster method would return
    const ItemMaster = require('./backend/models/ItemMaster');
    const modelResult = await ItemMaster.getSerialNumberRequiredItems();
    console.log('\n=== ITEMMASTER METHOD RESULT ===');
    console.log(`Found ${modelResult.length} items:`);
    console.log(JSON.stringify(modelResult, null, 2));

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
