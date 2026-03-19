const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Current serialnumber table schema ===\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'serialnumber'
      ORDER BY ordinal_position
    `);

    console.log(`Total columns: ${result.rows.length}\n`);
    result.rows.forEach((row, i) => {
      const nullable = row.is_nullable === 'YES' ? '✓ nullable' : '✗ NOT NULL';
      console.log(`${String(i + 1).padStart(2, ' ')}. ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(25)} | ${nullable}`);
    });

    // Check for duplicate model columns
    const modelColumns = result.rows.filter(r => r.column_name.toLowerCase() === 'model');
    if (modelColumns.length > 1) {
      console.log(`\n⚠️  WARNING: Found ${modelColumns.length} "model" columns (case-sensitive)`);
      console.log('Column names:', modelColumns.map(m => m.column_name));
      console.log('\nThese should be consolidated into ONE lowercase "model" column');
    }

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
