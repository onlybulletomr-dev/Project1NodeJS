const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Making "invoiceid" column nullable ===\n');

    // Alter the column to allow NULL
    await pool.query(`
      ALTER TABLE serialnumber
      ALTER COLUMN invoiceid DROP NOT NULL
    `);

    console.log('✅ Column "invoiceid" now allows NULL values');

    // Verify the constraint change
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name IN ('invoiceid', 'itemid', 'serialnumber')
      ORDER BY ordinal_position
    `);

    console.log('\nColumn details:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: nullable=${row.is_nullable}, type=${row.data_type}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
