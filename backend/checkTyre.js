const pool = require('./config/db');

async function checkTyre() {
  try {
    // Check itemmaster
    const itemResult = await pool.query(`
      SELECT itemid, itemname, partnumber, serialnumbertracking 
      FROM itemmaster 
      WHERE itemname ILIKE '%tyre%' OR partnumber ILIKE '%tyre%'
    `);
    
    console.log('=== ITEMMASTER ===');
    console.log('Found items:', itemResult.rows);
    
    if (itemResult.rows.length > 0) {
      const itemid = itemResult.rows[0].itemid;
      
      // Check itemdetail for that item
      const detailResult = await pool.query(`
        SELECT itemid, branchid, quantityonhand, qtyonhand, quantity, qty
        FROM itemdetail 
        WHERE itemid = $1
      `, [itemid]);
      
      console.log('\n=== ITEMDETAIL ===');
      console.log('Found details:', detailResult.rows);
    }
    
    // Test search
    const searchResult = await pool.query(`
      SELECT DISTINCT id.itemid, im.partnumber, im.itemname 
      FROM itemdetail id
      JOIN itemmaster im ON id.itemid = im.itemid
      WHERE id.branchid = 1 AND id.deletedat IS NULL AND im.deletedat IS NULL
        AND (im.partnumber ILIKE '%tyre%' OR im.itemname ILIKE '%tyre%')
    `);
    
    console.log('\n=== SEARCH RESULT (using itemdetail join) ===');
    console.log('Found:', searchResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTyre();
