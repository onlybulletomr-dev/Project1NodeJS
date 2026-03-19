const pool = require('../config/db');

/**
 * Migration: Add discount percentage and order type to ItemMaster table
 * 
 * New fields:
 * - discountpercentage: Discount percentage for this item (0-100)
 * - ordertype: Type of ordering (WEEKLY, ADHOC, IN_BOXES, BULK, REGULAR, etc.)
 */

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Add discount & ordertype to ItemMaster table...');

    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'itemmaster' 
      AND column_name IN ('discountpercentage', 'ordertype')
    `;
    
    const existingColumns = await client.query(checkQuery);
    const existingColNames = existingColumns.rows.map(r => r.column_name);
    
    console.log('Existing columns:', existingColNames);

    // Add discountpercentage if missing
    if (!existingColNames.includes('discountpercentage')) {
      console.log('Adding discountpercentage column...');
      await client.query(`
        ALTER TABLE itemmaster
        ADD COLUMN discountpercentage NUMERIC(5,2) DEFAULT 0 CHECK (discountpercentage >= 0 AND discountpercentage <= 100)
      `);
      console.log('✓ discountpercentage added');
    } else {
      console.log('⚠ discountpercentage already exists');
    }

    // Add ordertype if missing
    if (!existingColNames.includes('ordertype')) {
      console.log('Adding ordertype column...');
      await client.query(`
        ALTER TABLE itemmaster
        ADD COLUMN ordertype VARCHAR(50)
      `);
      console.log('✓ ordertype added');
    } else {
      console.log('⚠ ordertype already exists');
    }

    // Create indexes for better query performance
    console.log('Creating indexes...');
    
    try {
      await client.query(`CREATE INDEX idx_itemmaster_discountpercentage ON itemmaster(discountpercentage)`);
      console.log('✓ Index on discountpercentage created');
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('⚠ Index already exists');
    }

    try {
      await client.query(`CREATE INDEX idx_itemmaster_ordertype ON itemmaster(ordertype)`);
      console.log('✓ Index on ordertype created');
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('⚠ Index already exists');
    }

    // Display final schema
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'itemmaster' 
      ORDER BY ordinal_position
    `);

    console.log('\n=== Final ItemMaster Table Schema ===\n');
    console.table(schema.rows);

    console.log('\n=== Valid Order Types ===');
    console.log('• WEEKLY - Items ordered every week');
    console.log('• ADHOC - Items ordered as needed');
    console.log('• IN_BOXES - Items sold in boxes/crates');
    console.log('• BULK - Large bulk orders');
    console.log('• REGULAR - Regular stock items');
    console.log('• SEASONAL - Seasonal items');
    console.log('• ON_DEMAND - Made to order');

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
