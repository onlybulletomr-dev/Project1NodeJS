const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Converting purchaseinvoiceid from INTEGER to VARCHAR ===\n');

    // Check current type
    const checkResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name = 'purchaseinvoiceid'
    `);

    if (checkResult.rows.length === 0) {
      throw new Error('Column purchaseinvoiceid not found');
    }

    console.log(`Current type: ${checkResult.rows[0].data_type}`);

    // Convert to VARCHAR
    console.log('\nConverting to character varying...');
    await pool.query(`
      ALTER TABLE serialnumber
      ALTER COLUMN purchaseinvoiceid TYPE character varying(100)
    `);

    console.log('✅ Column type changed to character varying(100)');

    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name = 'purchaseinvoiceid'
    `);

    console.log(`\nNew type: ${verifyResult.rows[0].data_type}`);
    console.log('✅ Ready to accept PO/Invoice numbers like "PO-2026-001", "INV-12345", etc.');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
