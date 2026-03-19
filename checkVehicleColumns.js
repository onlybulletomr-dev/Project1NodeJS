const pool = require('./backend/config/db');

async function checkVehicleColumns() {
  try {
    const result = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'vehicle' 
       ORDER BY ordinal_position`
    );

    console.log('All columns in vehicle table:');
    const columns = result.rows.map(r => r.column_name);
    columns.forEach((col, i) => {
      console.log(`${i + 1}. ${col}`);
    });

    console.log('\n✅ Columns retrieved!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkVehicleColumns();
