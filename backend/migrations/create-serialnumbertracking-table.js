const pool = require('../config/db');

/**
 * Migration: Create SerialNumberTracking Configuration Table
 * Tracks serial number tracking configuration per item and branch
 * Maintains audit trail of when serial tracking is enabled/disabled
 * 
 * Fields:
 * - serialnumbertrackingid: Unique identifier
 * - itemid: FK to itemmaster
 * - branchid: FK to companymaster (branch-specific config)
 * - requireserials: Whether this item requires serial numbers
 * - allowduplicates: Whether duplicate serial numbers are allowed for this item
 * - description: Why serial tracking is enabled/disabled
 * - enabledat: When tracking was enabled
 * - disabledat: When tracking was disabled
 * - audit columns: createdby, createdat, updatedby, updatedat, deletedat
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Create SerialNumberTracking table...');

    // Check if table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'serialnumbertracking'
      )
    `);

    if (!tableCheckResult.rows[0].exists) {
      console.log('Creating serialnumbertracking table...');
      await client.query(`
        CREATE TABLE serialnumbertracking (
          serialnumbertrackingid SERIAL PRIMARY KEY,
          itemid INTEGER NOT NULL REFERENCES itemmaster(itemid) ON DELETE CASCADE,
          branchid INTEGER NOT NULL,
          requireserials BOOLEAN DEFAULT FALSE,
          allowduplicates BOOLEAN DEFAULT FALSE,
          description VARCHAR(500),
          enabledat TIMESTAMP,
          disabledat TIMESTAMP,
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
      await client.query(`CREATE INDEX idx_snt_requireserials ON serialnumbertracking(requireserials)`);
      await client.query(`CREATE INDEX idx_snt_deleted ON serialnumbertracking(deletedat) WHERE deletedat IS NULL`);

      console.log('✓ SerialNumberTracking table created successfully');
    } else {
      console.log('⚠ SerialNumberTracking table already exists');
    }

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
