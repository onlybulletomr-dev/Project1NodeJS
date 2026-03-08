const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'erp_db'
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'itemdetail'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ITEMDETAIL TABLE COLUMNS ===');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    // Also check itemmaster
    const imResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'itemmaster'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ITEMMASTER TABLE COLUMNS ===');
    imResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
