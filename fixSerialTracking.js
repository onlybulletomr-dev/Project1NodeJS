const pool = require('./backend/config/db');

(async () => {
  try {
    // Step 1: Disable serialnumbertracking for all items EXCEPT Battery (68558) and Tyre (68559)
    const disableResult = await pool.query(
      `UPDATE itemmaster 
       SET serialnumbertracking = false, updatedat = CURRENT_TIMESTAMP
       WHERE itemid NOT IN (68558, 68559) AND serialnumbertracking = true AND deletedat IS NULL
       RETURNING itemid, partnumber, itemname`
    );
    
    console.log(`\n✅ Disabled serial tracking for ${disableResult.rowCount} items`);

    // Step 2: Ensure Battery and Tyre have serialnumbertracking = true
    const enableResult = await pool.query(
      `UPDATE itemmaster 
       SET serialnumbertracking = true, updatedat = CURRENT_TIMESTAMP
       WHERE itemid IN (68558, 68559) AND deletedat IS NULL
       RETURNING itemid, partnumber, itemname, serialnumbertracking`
    );
    
    console.log(`\n✅ Enabled serial tracking for ${enableResult.rowCount} items:`);
    enableResult.rows.forEach(row => {
      console.log(`  - ID: ${row.itemid}, Name: ${row.itemname}, Tracking: ${row.serialnumbertracking}`);
    });

    // Step 3: Verify final state
    const verify = await pool.query(
      `SELECT itemid, partnumber, itemname, serialnumbertracking 
       FROM itemmaster 
       WHERE serialnumbertracking = TRUE AND deletedat IS NULL 
       ORDER BY partnumber`
    );
    
    console.log(`\n✅ Final state: ${verify.rowCount} items have serial number tracking enabled`);
    console.log('\nItems with serial tracking:');
    verify.rows.forEach(row => {
      console.log(`  - ID: ${row.itemid}, Name: ${row.itemname}`);
    });

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
