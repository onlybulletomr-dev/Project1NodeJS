const pool = require('./backend/config/db');

(async () => {
  try {
    // Check items named 'tyre' or 'battery'
    const result = await pool.query(
      `SELECT itemid, partnumber, itemname, serialnumbertracking, deletedat FROM itemmaster 
       WHERE LOWER(itemname) LIKE '%tyre%' OR LOWER(itemname) LIKE '%battery%' OR LOWER(partnumber) LIKE '%tyre%' OR LOWER(partnumber) LIKE '%battery%'
       ORDER BY itemid`
    );
    console.log('\n=== Items with tyre or battery in name ===');
    console.log(JSON.stringify(result.rows, null, 2));

    // Now check what getSerialNumberRequiredItems would return
    const trackingResult = await pool.query(
      `SELECT itemid, partnumber, itemname, serialnumbertracking, duplicateserialnumber, points
       FROM itemmaster 
       WHERE serialnumbertracking = TRUE AND deletedat IS NULL 
       ORDER BY partnumber`
    );
    console.log('\n=== Items with serialnumbertracking = true ===');
    console.log(JSON.stringify(trackingResult.rows, null, 2));

    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
})();
