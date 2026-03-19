const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Adding "model" column to serialnumber table ===\n');

    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name = 'model'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column "model" already exists');
      process.exit(0);
    }

    // Add the column
    await pool.query(`
      ALTER TABLE serialnumber
      ADD COLUMN model character varying(255)
    `);

    console.log('✅ Column "model" added successfully');

    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'serialnumber'
      ORDER BY ordinal_position
    `);

    console.log(`\n✅ Total columns now: ${verifyResult.rows.length}`);
    console.log('\nUpdated schema:');
    verifyResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.column_name}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
