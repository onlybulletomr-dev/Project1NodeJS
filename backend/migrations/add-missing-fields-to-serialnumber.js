const pool = require('../config/db');

/**
 * Migration: Add missing fields to SerialNumber table
 * Retains all existing fields and adds:
 * - branchid: Which branch owns this inventory
 * - vendorid: Which vendor supplied this item
 * - mrp: Maximum retail price
 * - status: Current status (SHELF/INVOICED/RETURNED/SCRAPED)
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Add missing fields to SerialNumber table...');

    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'serialnumber' 
      AND column_name IN ('branchid', 'vendorid', 'mrp', 'status')
    `;
    
    const existingColumns = await client.query(checkQuery);
    const existingColNames = existingColumns.rows.map(r => r.column_name);
    
    console.log('Existing columns:', existingColNames);

    // Add branchid if missing
    if (!existingColNames.includes('branchid')) {
      console.log('Adding branchid column...');
      await client.query(`
        ALTER TABLE serialnumber
        ADD COLUMN branchid INTEGER REFERENCES companymaster(companyid)
      `);
      console.log('✓ branchid added');
    } else {
      console.log('⚠ branchid already exists');
    }

    // Add vendorid if missing
    if (!existingColNames.includes('vendorid')) {
      console.log('Adding vendorid column...');
      await client.query(`
        ALTER TABLE serialnumber
        ADD COLUMN vendorid INTEGER REFERENCES companymaster(companyid)
      `);
      console.log('✓ vendorid added');
    } else {
      console.log('⚠ vendorid already exists');
    }

    // Add mrp if missing
    if (!existingColNames.includes('mrp')) {
      console.log('Adding mrp column...');
      await client.query(`
        ALTER TABLE serialnumber
        ADD COLUMN mrp DECIMAL(10,2)
      `);
      console.log('✓ mrp added');
    } else {
      console.log('⚠ mrp already exists');
    }

    // Add status if missing
    if (!existingColNames.includes('status')) {
      console.log('Adding status column...');
      await client.query(`
        ALTER TABLE serialnumber
        ADD COLUMN status VARCHAR(50) DEFAULT 'SHELF'
      `);
      console.log('✓ status added');
    } else {
      console.log('⚠ status already exists');
    }

    // Create indexes for new columns
    console.log('Creating indexes...');
    
    try {
      await client.query(`CREATE INDEX idx_serialnumber_branchid ON serialnumber(branchid)`);
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('⚠ Index idx_serialnumber_branchid already exists');
    }

    try {
      await client.query(`CREATE INDEX idx_serialnumber_vendorid ON serialnumber(vendorid)`);
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('⚠ Index idx_serialnumber_vendorid already exists');
    }

    try {
      await client.query(`CREATE INDEX idx_serialnumber_status ON serialnumber(status)`);
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('⚠ Index idx_serialnumber_status already exists');
    }

    // Display final schema
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'serialnumber' 
      ORDER BY ordinal_position
    `);

    console.log('\n=== Final SerialNumber Table Schema ===\n');
    console.table(schema.rows);

    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
