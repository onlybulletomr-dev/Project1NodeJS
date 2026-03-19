const pool = require('../config/db');

/**
 * Migration: Add Serial Number and Points fields to ItemMaster
 * - duplicateserialnumber: BOOLEAN (default FALSE) - indicates if same item can have duplicate serial numbers
 *   (Note: serialnumbertracking already exists to indicate if item uses serial numbers)
 * - points: INTEGER (default 0) - points awarded by vendor for each purchase of this item
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Add serial number and points fields to ItemMaster...');

    // Check if columns already exist
    const checkColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'itemmaster' 
      AND column_name IN ('duplicateserialnumber', 'points')
    `);

    const existingColumns = checkColumnsResult.rows.map(r => r.column_name);

    if (!existingColumns.includes('duplicateserialnumber')) {
      console.log('Adding column: duplicateserialnumber...');
      await client.query(`
        ALTER TABLE itemmaster 
        ADD COLUMN duplicateserialnumber BOOLEAN DEFAULT FALSE
      `);
      console.log('✓ Column duplicateserialnumber added');
    } else {
      console.log('⚠ Column duplicateserialnumber already exists');
    }

    if (!existingColumns.includes('points')) {
      console.log('Adding column: points...');
      await client.query(`
        ALTER TABLE itemmaster 
        ADD COLUMN points INTEGER DEFAULT 0
      `);
      console.log('✓ Column points added');
    } else {
      console.log('⚠ Column points already exists');
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
