const pool = require('./config/db');

async function checkItemDetail() {
  try {
    // Check itemdetail table columns
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'itemdetail' ORDER BY ordinal_position`
    );
    
    console.log('✅ ItemDetail Table Columns:');
    cols.rows.forEach(col => {
      console.log(`   ${col.column_name.toLowerCase()} (${col.data_type})`);
    });

    // Check if table exists
    const tableExists = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'itemdetail'
       )`
    );
    
    console.log('\n✅ ItemDetail Table Exists:', tableExists.rows[0].exists);

    // Try a sample query
    const sample = await pool.query(
      `SELECT * FROM itemdetail LIMIT 1`
    );
    
    console.log('\n✅ Sample row from itemdetail:', sample.rows[0] || 'No rows');

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

checkItemDetail();
