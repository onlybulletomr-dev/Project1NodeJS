const pool = require('./config/db');

async function checkDe() {
  try {
    // Check itemdetail for itemid 68559
    const result = await pool.query(`
      SELECT COUNT(*) 
      FROM itemdetail 
      WHERE itemid = 68559
    `);
    
    console.log('Itemdetail rows for tyre (68559):', result.rows[0].count);
    
    // List some
    const rows = await pool.query(`
      SELECT itemid, branchid 
      FROM itemdetail 
      WHERE itemid = 68559
      LIMIT 5
    `);
    
    console.log('Sample rows:', rows.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDe();
