const pool = require('./config/db');

async function testQuery() {
  try {
    const query = `
      SELECT DISTINCT
        im.itemid,
        im.partnumber,
        im.itemname AS itemdescription,
        im.itemname,
        im.uom,
        im.mrp,
        im.points,
        im.duplicateserialnumber,
        im.serialnumbertracking,
        0 AS availableqty,
        'itemmaster' AS source_type
      FROM itemmaster im
      WHERE im.serialnumbertracking = true
        AND im.deletedat IS NULL
        AND (im.partnumber ILIKE $1 OR im.itemname ILIKE $1)
        AND NOT EXISTS (SELECT 1 FROM itemdetail WHERE itemid = im.itemid AND branchid = $2)
      
      ORDER BY partnumber
    `;
    
    const result = await pool.query(query, ['%tyre%', 1]);
    console.log('Query result:', result.rows);
    process.exit(0);
  } catch(error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testQuery();
