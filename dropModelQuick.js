const pool = require('./backend/config/db');

(async () => {
  try {
    // Try dropping with quoted name
    console.log('Attempting to drop "Model" column...');
    try {
      await pool.query(`ALTER TABLE serialnumber DROP COLUMN IF EXISTS "Model"`);
      console.log('✅ Dropped "Model" column (capitalized)');
    } catch (err) {
      console.log('Note: Could not drop "Model":', err.message);
    }

    // Verify
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'serialnumber'
      AND column_name IN ('Model', 'model')
      ORDER BY column_name
    `);

    console.log('\nColumns containing "model" (case-insensitive):');
    result.rows.forEach(r => console.log(`  - ${r.column_name}`));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
