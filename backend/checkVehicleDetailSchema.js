const pool = require('./config/db');

async function checkSchema() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'vehicledetail' ORDER BY ordinal_position`
    );
    console.log('VehicleDetail table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkSchema();
