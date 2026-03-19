const pool = require('../config/db');

/**
 * Migration: Add vendor, MRP, manufacturing date, and status fields to SerialNumber table
 * This is for existing tables - adds missing columns
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Add vendor, MRP, manufacturing date, and status to SerialNumber...');

    // Check which columns already exist
    const checkColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'serialnumber'
      AND column_name IN ('vendorid', 'mrp', 'manufacturingdate', 'status')
    `);

    const existingColumns = checkColumnsResult.rows.map(r => r.column_name);

    if (!existingColumns.includes('vendorid')) {
      console.log('Adding column: vendorid...');
      await client.query(`
        ALTER TABLE serialnumber 
        ADD COLUMN vendorid INTEGER REFERENCES companymaster(branchid)
      `);
      console.log('✓ Column vendorid added');
    } else {
      console.log('⚠ Column vendorid already exists');
    }

    if (!existingColumns.includes('mrp')) {
      console.log('Adding column: mrp...');
      await client.query(`
        ALTER TABLE serialnumber 
        ADD COLUMN mrp DECIMAL(10,2)
      `);
      console.log('✓ Column mrp added');
    } else {
      console.log('⚠ Column mrp already exists');
    }

    if (!existingColumns.includes('manufacturingdate')) {
      console.log('Adding column: manufacturingdate...');
      await client.query(`
        ALTER TABLE serialnumber 
        ADD COLUMN manufacturingdate DATE
      `);
      console.log('✓ Column manufacturingdate added');
    } else {
      console.log('⚠ Column manufacturingdate already exists');
    }

    if (!existingColumns.includes('status')) {
      console.log('Adding column: status...');
      await client.query(`
        ALTER TABLE serialnumber 
        ADD COLUMN status VARCHAR(50) DEFAULT 'SHELF'
      `);
      console.log('✓ Column status added');
    } else {
      console.log('⚠ Column status already exists');
    }

    // Check if indexes exist
    const indexCheckResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'serialnumber'
      AND indexname IN ('idx_serialnumber_vendorid', 'idx_serialnumber_status')
    `);

    const existingIndexes = indexCheckResult.rows.map(r => r.indexname);

    if (!existingIndexes.includes('idx_serialnumber_vendorid')) {
      console.log('Creating index: idx_serialnumber_vendorid...');
      await client.query(`CREATE INDEX idx_serialnumber_vendorid ON serialnumber(vendorid)`);
      console.log('✓ Index idx_serialnumber_vendorid created');
    }

    if (!existingIndexes.includes('idx_serialnumber_status')) {
      console.log('Creating index: idx_serialnumber_status...');
      await client.query(`CREATE INDEX idx_serialnumber_status ON serialnumber(status)`);
      console.log('✓ Index idx_serialnumber_status created');
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
