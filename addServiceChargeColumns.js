const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Adding servicechargeids column to invoicedetail ===\n');
    
    // Check if column already exists
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'invoicedetail' AND column_name = 'servicechargeids'`
    );
    
    if (columnCheck.rows.length > 0) {
      console.log('✓ servicechargeids column already exists');
    } else {
      // Add the column
      await pool.query(
        `ALTER TABLE invoicedetail ADD COLUMN servicechargeids INTEGER DEFAULT 0`
      );
      console.log('✓ Added servicechargeids column (DEFAULT 0)');
    }
    
    // Check if servicechargemethod column exists
    const methodCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'invoicedetail' AND column_name = 'servicechargemethod'`
    );
    
    if (methodCheck.rows.length > 0) {
      console.log('✓ servicechargemethod column already exists');
    } else {
      // Add the method column
      await pool.query(
        `ALTER TABLE invoicedetail ADD COLUMN servicechargemethod VARCHAR(50) DEFAULT 'None'`
      );
      console.log('✓ Added servicechargemethod column (Overhauling, Add, None)');
    }
    
    // Verify
    const verify = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'invoicedetail' 
       AND column_name IN ('servicechargeids', 'servicechargemethod')`
    );
    
    console.log('\n✅ Columns successfully added/verified:');
    verify.rows.forEach(row => console.log(`   - ${row.column_name}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
