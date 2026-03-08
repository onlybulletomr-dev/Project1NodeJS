const pool = require('./backend/config/db');

async function check() {
  try {
    // Check user 1's branch
    const userResult = await pool.query(
      `SELECT employeeid, branchid FROM employeemaster WHERE employeeid = 1 LIMIT 1`
    );
    console.log('\n=== User 1 Info ===');
    if (userResult.rows.length > 0) {
      console.log('Employee ID:', userResult.rows[0].employeeid);
      console.log('Branch ID:', userResult.rows[0].branchid);
    } else {
      console.log('No user with ID 1');
    }

    // Check item 888414
    const itemResult = await pool.query(
      `SELECT * FROM itemmaster WHERE partnumber = '888414'`
    );
    console.log('\n=== Item 888414 in ItemMaster ===');
    if (itemResult.rows.length > 0) {
      console.log('ItemID:', itemResult.rows[0].itemid);
      console.log('PartNumber:', itemResult.rows[0].partnumber);
      console.log('ItemName:', itemResult.rows[0].itemname);
    } else {
      console.log('Item 888414 not found in itemmaster');
    }

    // Check itemdetail for item 888414 in all branches
    if (itemResult.rows.length > 0) {
      const itemId = itemResult.rows[0].itemid;
      const detailResult = await pool.query(
        `SELECT * FROM itemdetail WHERE itemid = $1 ORDER BY branchid`,
        [itemId]
      );
      console.log(`\n=== Item ${itemId} (888414) in ItemDetail ===`);
      if (detailResult.rows.length > 0) {
        detailResult.rows.forEach(row => {
          console.log(`Branch ${row.branchid}: Qty=${row.quantityonhand}, Deleted=${row.deletedat}`);
        });
      } else {
        console.log('Item 888414 has NO entries in itemdetail');
      }
    }

    // Check all items in itemdetail for user's branch
    const branchId = userResult.rows[0]?.branchid || 1;
    const branchItemsResult = await pool.query(
      `SELECT id.itemid, im.partnumber, im.itemname, id.quantityonhand
       FROM itemdetail id
       JOIN itemmaster im ON id.itemid = im.itemid
       WHERE id.branchid = $1 AND id.deletedat IS NULL AND im.deletedat IS NULL
       ORDER BY im.partnumber`,
      [branchId]
    );
    console.log(`\n=== All Active Items in Branch ${branchId} ===`);
    console.log(`Found ${branchItemsResult.rows.length} items`);
    branchItemsResult.rows.slice(0, 10).forEach(row => {
      console.log(`${row.partnumber}: ${row.itemname} (Qty=${row.quantityonhand})`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

check();
