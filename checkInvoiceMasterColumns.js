const pool = require('./backend/config/db');

async function getAllColumns() {
  try {
    const result = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'invoicemaster' 
       ORDER BY ordinal_position`
    );

    console.log('All columns in invoicemaster:');
    const columns = result.rows.map(r => r.column_name);
    columns.forEach((col, i) => {
      console.log(`${i + 1}. ${col}`);
    });

    console.log('\n✅ Columns retrieved successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getAllColumns();
