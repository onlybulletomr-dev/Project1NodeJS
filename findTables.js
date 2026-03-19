const pool = require('./backend/config/db');

async function findVehicleTables() {
  try {
    const result = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );

    console.log('All tables in database:');
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.table_name}`);
    });

    console.log('\n✅ Tables retrieved!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findVehicleTables();
