const pool = require('./config/db');

async function check() {
  try {
    // Check itemdetail columns
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'itemdetail'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ITEMDETAIL COLUMNS ===');
    columns.rows.forEach(row => {
      console.log(row.column_name);
    });

    // Check itemmaster columns  
    const imColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'itemmaster'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ITEMMASTER COLUMNS ===');
    imColumns.rows.forEach(row => {
      console.log(row.column_name);
    });

    // Try a simple select from itemdetail
    const selectResult = await pool.query(`SELECT COUNT(*) as count FROM itemdetail`);
    console.log('\n=== ITEMDETAIL COUNT ===');
    console.log('Total rows:', selectResult.rows[0].count);

    // Get one sample row
    const sampleResult = await pool.query(`SELECT * FROM itemdetail LIMIT 1`);
    console.log('\n=== SAMPLE ITEMDETAIL ROW ===');
    if (sampleResult.rows.length > 0) {
      console.log('Columns in row:', Object.keys(sampleResult.rows[0]).join(', '));
    } else {
      console.log('No rows in itemdetail');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();
