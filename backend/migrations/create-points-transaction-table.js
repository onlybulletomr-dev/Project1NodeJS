const pool = require('../config/db');

/**
 * Migration: Create PointsTransaction table
 * Tracks all points earned/consumed for vendor purchases and redemptions
 * Points are awarded when main vendor (BranchId=1) purchases items
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Create PointsTransaction table...');

    // Check if table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'pointstransaction'
      )
    `);

    if (!tableCheckResult.rows[0].exists) {
      console.log('Creating pointstransaction table...');
      await client.query(`
        CREATE TABLE pointstransaction (
          pointstransactionid SERIAL PRIMARY KEY,
          invoiceid INTEGER NOT NULL REFERENCES invoicemaster(invoiceid),
          itemid INTEGER NOT NULL REFERENCES itemmaster(itemid),
          invoicedetailid INTEGER NOT NULL REFERENCES invoicedetail(invoicedetailid),
          branchid INTEGER NOT NULL REFERENCES companymaster(branchid),
          quantitypurchased DECIMAL(10,2) NOT NULL,
          pointsperunit DECIMAL(10,2) NOT NULL DEFAULT 1.0,
          totalpointsawarded DECIMAL(10,2) NOT NULL,
          transactiontype VARCHAR(50) DEFAULT 'PURCHASE',
          remarks VARCHAR(500),
          createdby INTEGER NOT NULL REFERENCES employeemaster(employeeid),
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedby INTEGER REFERENCES employeemaster(employeeid),
          updatedat TIMESTAMP,
          deletedat TIMESTAMP
        );
      `);

      // Create indexes for better query performance
      console.log('Creating indexes...');
      await client.query(`CREATE INDEX idx_pointstx_invoiceid ON pointstransaction(invoiceid)`);
      await client.query(`CREATE INDEX idx_pointstx_itemid ON pointstransaction(itemid)`);
      await client.query(`CREATE INDEX idx_pointstx_branchid ON pointstransaction(branchid)`);
      await client.query(`CREATE INDEX idx_pointstx_createdat ON pointstransaction(createdat)`);
      
      console.log('✓ PointsTransaction table created with indexes');
    } else {
      console.log('⚠ PointsTransaction table already exists');
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
