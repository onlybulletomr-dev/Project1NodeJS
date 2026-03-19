const pool = require('./backend/config/db');

(async () => {
  try {
    // Update tyre and battery items to enable serialnumbertracking
    const result = await pool.query(
      `UPDATE itemmaster 
       SET serialnumbertracking = true, updatedat = CURRENT_TIMESTAMP
       WHERE (LOWER(itemname) LIKE '%tyre%' OR LOWER(itemname) LIKE '%battery%' OR 
              LOWER(partnumber) LIKE '%tyre%' OR LOWER(partnumber) LIKE '%battery%')
       AND deletedat IS NULL
       RETURNING itemid, partnumber, itemname, serialnumbertracking`
    );
    
    console.log(`\n✅ Updated ${result.rowCount} items`);
    console.log('\nUpdated items:');
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.itemid}, Name: ${row.itemname}, Tracking: ${row.serialnumbertracking}`);
    });

    // Verify the changes
    const verify = await pool.query(
      `SELECT itemid, partnumber, itemname, serialnumbertracking 
       FROM itemmaster 
       WHERE serialnumbertracking = TRUE AND deletedat IS NULL 
       ORDER BY partnumber`
    );
    
    console.log(`\n✅ Now ${verify.rowCount} items have serial number tracking enabled`);
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
