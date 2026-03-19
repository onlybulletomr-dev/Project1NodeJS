const pool = require('../config/db');

/**
 * Migration: Fix SerialNumber table - Drop and recreate with corrected foreign keys
 * 
 * Finalized fields:
 * - serialnumberid (PK)
 * - itemid (FK to itemmaster)
 * - invoicedetailid (FK to invoicedetail)
 * - serialnumber (the actual serial number string)
 * - branchid (which branch)
 * - vendorid (FK to companymaster - which vendor)
 * - mrp (minimum resale price)
 * - manufacturingdate (when manufactured)
 * - status (SHELF/INVOICED/RETURNED/SCRAPED)
 * - remarks, createdby, createdat, updatedby, updatedat, deletedat (audit columns)
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Fix SerialNumber table with corrected foreign keys...');

    // Check if table exists and drop it
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'serialnumber'
      )
    `);

    if (tableCheckResult.rows[0].exists) {
      console.log('Dropping existing serialnumber table...');
      await client.query(`DROP TABLE IF EXISTS serialnumber CASCADE`);
      console.log('✓ Table dropped');
    }

    // Create new table with correct foreign key constraints
    console.log('Creating serialnumber table with finalized fields...');
    await client.query(`
      CREATE TABLE serialnumber (
        serialnumberid SERIAL PRIMARY KEY,
        itemid INTEGER NOT NULL REFERENCES itemmaster(itemid) ON DELETE CASCADE,
        invoicedetailid INTEGER REFERENCES invoicedetail(invoicedetailid) ON DELETE SET NULL,
        serialnumber VARCHAR(255) NOT NULL,
        branchid INTEGER NOT NULL,
        vendorid INTEGER REFERENCES companymaster(companyid) ON DELETE SET NULL,
        mrp DECIMAL(10,2),
        manufacturingdate DATE,
        status VARCHAR(50) DEFAULT 'SHELF',
        remarks VARCHAR(500),
        createdby INTEGER NOT NULL REFERENCES employeemaster(employeeid),
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedby INTEGER REFERENCES employeemaster(employeeid),
        updatedat TIMESTAMP,
        deletedat TIMESTAMP,
        UNIQUE(itemid, serialnumber, branchid)
      );
    `);

    // Create indexes for better query performance
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX idx_serialnumber_itemid ON serialnumber(itemid)`);
    await client.query(`CREATE INDEX idx_serialnumber_invoicedetailid ON serialnumber(invoicedetailid)`);
    await client.query(`CREATE INDEX idx_serialnumber_branchid ON serialnumber(branchid)`);
    await client.query(`CREATE INDEX idx_serialnumber_serialnumber ON serialnumber(serialnumber)`);
    await client.query(`CREATE INDEX idx_serialnumber_vendorid ON serialnumber(vendorid)`);
    await client.query(`CREATE INDEX idx_serialnumber_status ON serialnumber(status)`);
    await client.query(`CREATE INDEX idx_serialnumber_mfgdate ON serialnumber(manufacturingdate)`);
    await client.query(`CREATE INDEX idx_serialnumber_deleted ON serialnumber(deletedat) WHERE deletedat IS NULL`);

    console.log('✓ SerialNumber table created with finalized fields and proper constraints');
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
