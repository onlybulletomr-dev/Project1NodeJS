const pool = require('./config/db');

async function checkItem(itemid) {
  try {
    // Check itemmaster
    const itemResult = await pool.query(`
      SELECT itemid, itemname, partnumber FROM itemmaster WHERE itemid = $1
    `, [itemid]);
    
    if (itemResult.rows.length === 0) {
      console.log('Item not found in itemmaster:', itemid);
      process.exit(0);
    }
    
    console.log('Item found:', itemResult.rows[0]);
    
    // Check itemdetail count
    const countResult = await pool.query(`
      SELECT COUNT(*) as cnt FROM itemdetail WHERE itemid = $1
    `, [itemid]);
    
    console.log('Itemdetail records:', countResult.rows[0].cnt);
    
    // Check all branches
    const branchDetail = await pool.query(`
      SELECT DISTINCT branchid FROM itemdetail WHERE itemid = $1
    `, [itemid]);
    
    console.log('Branches with itemdetail:', branchDetail.rows.map(r => r.branchid));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem(68558);
