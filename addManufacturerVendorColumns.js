const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Adding manufacturername and vendorname columns ===\n');

    // Step 1: Add manufacturername column
    console.log('Step 1: Adding manufacturername column...');
    const checkMfg = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name = 'manufacturername'
    `);

    if (checkMfg.rows.length === 0) {
      await pool.query(`
        ALTER TABLE serialnumber
        ADD COLUMN manufacturername character varying(255)
      `);
      console.log('✅ Column added: manufacturername');
    } else {
      console.log('ℹ️  Column manufacturername already exists');
    }

    // Step 2: Add vendorname column
    console.log('\nStep 2: Adding vendorname column...');
    const checkVendor = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'serialnumber' AND column_name = 'vendorname'
    `);

    if (checkVendor.rows.length === 0) {
      await pool.query(`
        ALTER TABLE serialnumber
        ADD COLUMN vendorname character varying(255)
      `);
      console.log('✅ Column added: vendorname');
    } else {
      console.log('ℹ️  Column vendorname already exists');
    }

    // Step 3: Verify final schema
    console.log('\n=== Final Schema ===');
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'serialnumber'
      ORDER BY ordinal_position
    `);

    console.log(`Total columns: ${result.rows.length}\n`);
    const relevantCols = result.rows.filter(r => 
      ['manufacturername', 'vendorname', 'remarks', 'status', 'mrp'].includes(r.column_name)
    );
    relevantCols.forEach(row => {
      console.log(`  ${row.column_name} - ${row.data_type}`);
    });

    console.log('\n✅ Schema updated successfully!');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
