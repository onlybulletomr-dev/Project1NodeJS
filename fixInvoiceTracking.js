const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Updating serialnumber schema for dual invoice tracking ===\n');

    // Step 1: Rename invoiceid to invoicedetailid (for sales/customer invoices)
    console.log('Step 1: Renaming invoiceid to invoicedetailid...');
    await pool.query(`
      ALTER TABLE serialnumber
      RENAME COLUMN invoiceid TO invoicedetailid
    `);
    console.log('✅ Column renamed: invoiceid → invoicedetailid');

    // Step 2: Make invoicedetailid nullable (for inventory before sales)
    console.log('\nStep 2: Making invoicedetailid nullable...');
    await pool.query(`
      ALTER TABLE serialnumber
      ALTER COLUMN invoicedetailid DROP NOT NULL
    `);
    console.log('✅ invoicedetailid now allows NULL');

    // Step 3: Add purchaseinvoiceid column (for vendor receipts)
    console.log('\nStep 3: Adding purchaseinvoiceid column...');
    const checkPurchaseResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name = 'purchaseinvoiceid'
    `);

    if (checkPurchaseResult.rows.length === 0) {
      await pool.query(`
        ALTER TABLE serialnumber
        ADD COLUMN purchaseinvoiceid integer
      `);
      console.log('✅ Column added: purchaseinvoiceid');
    } else {
      console.log('ℹ️  Column purchaseinvoiceid already exists');
    }

    // Step 4: Verify the schema
    console.log('\n=== Final Schema ===');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'serialnumber'
      ORDER BY ordinal_position
    `);

    console.log(`Total columns: ${result.rows.length}\n`);
    result.rows.forEach((row, i) => {
      const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      console.log(`${i + 1}. ${row.column_name} - ${row.data_type} ${nullable}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
