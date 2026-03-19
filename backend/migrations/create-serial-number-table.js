const pool = require('../config/db');

/**
 * Migration: Create SerialNumber table
 * Tracks individual serial numbers for items that require serial number tracking
 * Each serial number is linked to a purchase (InvoiceDetail) and tracks vendor, MRP, and status
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Create SerialNumber table...');

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
          itemid INTEGER NOT NULL REFERENCES itemmaster(itemid),
          invoicedetailid INTEGER REFERENCES invoicedetail(invoicedetailid),
          serialnumber VARCHAR(255) NOT NULL,
          branchid INTEGER NOT NULL REFERENCES companymaster(branchid),
          vendorid INTEGER REFERENCES companymaster(branchid),
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
      
      console.log('✓ SerialNumber table created with indexes');
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
