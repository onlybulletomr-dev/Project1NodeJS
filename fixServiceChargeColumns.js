const pool = require('./backend/config/db');

(async () => {
  try {
    console.log('\n=== Removing service charge columns from invoicedetail ===\n');
    
    // Remove servicechargeids column if it exists
    try {
      await pool.query(
        `ALTER TABLE invoicedetail DROP COLUMN IF EXISTS servicechargeids`
      );
      console.log('✓ Removed servicechargeids column from invoicedetail');
    } catch (err) {
      console.log('ℹ servicechargeids not found or already removed');
    }
    
    // Remove servicechargemethod column if it exists
    try {
      await pool.query(
        `ALTER TABLE invoicedetail DROP COLUMN IF EXISTS servicechargemethod`
      );
      console.log('✓ Removed servicechargemethod column from invoicedetail');
    } catch (err) {
      console.log('ℹ servicechargemethod not found or already removed');
    }
    
    console.log('\n=== Adding servicechargeid column to itemmaster ===\n');
    
    // Check if servicechargeid column already exists in itemmaster
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'itemmaster' AND column_name = 'servicechargeid'`
    );
    
    if (columnCheck.rows.length > 0) {
      console.log('✓ servicechargeid column already exists in itemmaster');
    } else {
      // Add the column to itemmaster
      await pool.query(
        `ALTER TABLE itemmaster ADD COLUMN servicechargeid INTEGER DEFAULT 0`
      );
      console.log('✓ Added servicechargeid column to itemmaster (DEFAULT 0)');
    }
    
    // Verify
    const verify = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'itemmaster' AND column_name = 'servicechargeid'`
    );
    
    if (verify.rows.length > 0) {
      console.log('\n✅ servicechargeid successfully added to itemmaster');
    } else {
      console.log('\n❌ servicechargeid not found in itemmaster');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
