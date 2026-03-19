const pool = require('./backend/config/db');

(async () => {
  try {
    // Get all columns from serialnumber table
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'serialnumber'
      ORDER BY ordinal_position
    `);

    console.log('\n=== Columns in serialnumber table ===');
    console.log(`Total columns: ${result.rows.length}\n`);
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.column_name} (${row.data_type})`);
    });

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
