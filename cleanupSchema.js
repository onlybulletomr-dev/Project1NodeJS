const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Cleaning up duplicate "Model" column ===\n');

    // Drop the capitalized "Model" column, keep lowercase "model"
    console.log('Dropping capitalized "Model" column...');
    await pool.query(`
      ALTER TABLE serialnumber
      DROP COLUMN "Model"
    `);
    console.log('✅ Dropped capitalized "Model" column');

    // Verify final schema
    console.log('\n=== Final verified schema ===\n');
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

    console.log('\n✅ Schema is now clean and ready!');
    console.log('\nKey columns for serial number tracking:');
    console.log('  - purchaseinvoiceid: For vendor purchase invoice tracking');
    console.log('  - invoicedetailid: For customer sales invoice tracking');
    console.log('  - status: SHELF, INVOICED, RETURNED, SCRAPED');
    console.log('  - model: Item variant/SKU');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
