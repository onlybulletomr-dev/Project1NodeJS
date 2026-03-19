const pool = require('../config/db');

/**
 * Migration: Recreate SerialNumberTracking table with finalized fields only
 * This table stores per-branch configuration for serial number tracking
 * 
 * Fields discussed and finalized:
 * - serialnumbertrackingid: Unique identifier
 * - itemid: FK to itemmaster
 * - branchid: Branch-specific configuration
 * - enabled: Whether serial tracking is enabled for this item in this branch
 * - createdby, createdat, updatedby, updatedat, deletedat: Audit trail
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Drop and recreate SerialNumberTracking table with finalized fields...');

    // Check if table exists and drop it
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'serialnumbertracking'
      )
    `);

    if (tableCheckResult.rows[0].exists) {
      console.log('Dropping existing serialnumbertracking table...');
      await client.query(`DROP TABLE IF EXISTS serialnumbertracking CASCADE`);
      console.log('✓ Table dropped');
    }

    // Create new table with finalized fields only
    console.log('Creating new serialnumbertracking table with finalized fields...');
    await client.query(`
      CREATE TABLE serialnumbertracking (
        serialnumbertrackingid SERIAL PRIMARY KEY,
        itemid INTEGER NOT NULL REFERENCES itemmaster(itemid) ON DELETE CASCADE,
        branchid INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        createdby INTEGER NOT NULL REFERENCES employeemaster(employeeid),
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedby INTEGER REFERENCES employeemaster(employeeid),
        updatedat TIMESTAMP,
        deletedat TIMESTAMP,
        UNIQUE(itemid, branchid)
      );
    `);

    // Create indexes for better query performance
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX idx_snt_itemid ON serialnumbertracking(itemid)`);
    await client.query(`CREATE INDEX idx_snt_branchid ON serialnumbertracking(branchid)`);
    await client.query(`CREATE INDEX idx_snt_itemid_branchid ON serialnumbertracking(itemid, branchid)`);
    await client.query(`CREATE INDEX idx_snt_enabled ON serialnumbertracking(enabled)`);
    await client.query(`CREATE INDEX idx_snt_deleted ON serialnumbertracking(deletedat) WHERE deletedat IS NULL`);

    console.log('✓ SerialNumberTracking table created with finalized fields');
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
