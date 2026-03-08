const { Pool } = require('pg');

// Create a direct pool connection without the app
const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'erp_db'
});

async function check() {
  try {
    // Check itemdetail columns
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'itemdetail'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ITEMDETAIL COLUMNS ===');
    result.rows.forEach(row => {
      console.log(row.column_name);
    });

    // Try a simple select
    const selectResult = await pool.query(`SELECT * FROM itemdetail LIMIT 1`);
    console.log('\n=== SAMPLE ROW ===');
    console.log(JSON.stringify(selectResult.rows[0], null, 2));

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

check();
