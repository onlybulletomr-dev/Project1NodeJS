const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db'
});

async function checkGsItems() {
  try {
    // Check if GS services are in itemmaster
    const result = await pool.query(
      `SELECT itemid, itemname, partnumber FROM itemmaster 
       WHERE itemname IN ('WATER WASH', 'CONSUMABLES', 'GENERAL SERVICE')
       ORDER BY itemid`
    );
    
    if (result.rows.length > 0) {
      console.log('Items matching GS service names (local database):');
      console.log(JSON.stringify(result.rows, null, 2));
    } else {
      console.log('No items found matching GS service names');
    }

    // Check items 340, 341, 342
    const result2 = await pool.query(
      `SELECT itemid, itemname, partnumber FROM itemmaster 
       WHERE itemid IN (340, 341, 342)
       ORDER BY itemid`
    );
    
    if (result2.rows.length > 0) {
      console.log('\nItems with IDs 340, 341, 342:');
      console.log(JSON.stringify(result2.rows, null, 2));
    } else {
      console.log('\nNo items found with IDs 340, 341, 342');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkGsItems();
