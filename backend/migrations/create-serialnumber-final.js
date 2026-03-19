const pool = require('../config/db');

/**
 * Migration: Create SerialNumber table
 * Tracks individual serial numbers with core fields
 * 
 * Fields:
 * - serialnumberid: Unique identifier (PK)
 * - invoiceid: Reference to invoice
 * - itemid: Reference to item
 * - serialnumber: The actual serial number string
 * - batch: Batch/Lot number
 * - manufacturingdate: Manufacturing date
 * - expirydate: Expiry date
 * - warrexpiry: Warranty expiry date
 * - condition: Item condition
 * - remarks: Additional notes
 * - Audit columns: createdby, createdat, updatedby, updatedat, deletedat
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Create SerialNumber table with finalized fields...');

    // Check if table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'serialnumber'
      )
    `);

    if (!tableCheckResult.rows[0].exists) {
      console.log('Creating serialnumber table...');
      await client.query(`
        CREATE TABLE serialnumber (
          serialnumberid SERIAL PRIMARY KEY,
          invoiceid INTEGER NOT NULL,
          itemid INTEGER NOT NULL,
          serialnumber VARCHAR(255) NOT NULL,
          batch VARCHAR(100),
          manufacturingdate DATE,
          expirydate DATE,
          warrexpiry DATE,
          condition VARCHAR(50),
          remarks VARCHAR(500),
          createdby INTEGER,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedby INTEGER,
          updatedat TIMESTAMP,
          deletedat TIMESTAMP,
          FOREIGN KEY (invoiceid, itemid) REFERENCES invoicedetail(invoiceid, itemid) ON DELETE CASCADE,
          UNIQUE(invoiceid, itemid, serialnumber)
        );
      `);

      // Create indexes for better query performance
      console.log('Creating indexes...');
      await client.query(`CREATE INDEX idx_serialnumber_invoiceid ON serialnumber(invoiceid)`);
      await client.query(`CREATE INDEX idx_serialnumber_itemid ON serialnumber(itemid)`);
      await client.query(`CREATE INDEX idx_serialnumber_serialnumber ON serialnumber(serialnumber)`);
      await client.query(`CREATE INDEX idx_serialnumber_batch ON serialnumber(batch)`);
      await client.query(`CREATE INDEX idx_serialnumber_deleted ON serialnumber(deletedat) WHERE deletedat IS NULL`);

      console.log('✓ SerialNumber table created with finalized fields');
    } else {
      console.log('⚠ SerialNumber table already exists');
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
