const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('[Migration] Starting vehicledetails → vehicledetail rename...');
    
    // Step 1: Drop foreign key constraint
    console.log('[Migration] Step 1: Dropping foreign key constraint...');
    await pool.query(`
      ALTER TABLE invoicemaster
      DROP CONSTRAINT IF EXISTS invoicemaster_vehicleid_fkey
    `);
    console.log('[Migration] ✓ Foreign key constraint dropped');

    // Step 2: Rename table
    console.log('[Migration] Step 2: Renaming table vehicledetails → vehicledetail...');
    await pool.query(`
      ALTER TABLE vehicledetails
      RENAME TO vehicledetail
    `);
    console.log('[Migration] ✓ Table renamed successfully');

    // Step 3: Recreate foreign key constraint
    console.log('[Migration] Step 3: Recreating foreign key constraint...');
    await pool.query(`
      ALTER TABLE invoicemaster
      ADD CONSTRAINT invoicemaster_vehicleid_fkey
      FOREIGN KEY (vehicleid) REFERENCES vehicledetail(vehicleid)
    `);
    console.log('[Migration] ✓ Foreign key constraint recreated');

    // Step 4: Verify the change
    console.log('[Migration] Step 4: Verifying rename...');
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('vehicledetail', 'vehicledetails') 
      AND table_schema = 'public'
    `);
    
    if (result.rows.length > 0) {
      console.log('[Migration] Tables found:', result.rows.map(r => r.table_name));
    }

    // Check vehicle count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM vehicledetail');
    console.log('[Migration] ✓ Total vehicles in vehicledetail table:', countResult.rows[0].count);

    console.log('[Migration] ✅ Successfully renamed vehicledetails to vehicledetail');
    process.exit(0);
  } catch (error) {
    console.error('[Migration ERROR]', error.message);
    console.error('[Migration ERROR] Stack:', error.stack);
    process.exit(1);
  }
}

runMigration();
