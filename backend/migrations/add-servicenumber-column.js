const pool = require('../config/db');

const migration = `
-- Migration: Add servicenumber column to ServiceMaster table

-- Check if column exists and add it if it doesn't
DO $$
BEGIN
    -- Add servicenumber column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='servicemaster' AND column_name='servicenumber'
    ) THEN
        ALTER TABLE servicemaster ADD COLUMN servicenumber VARCHAR(100) NOT NULL;
    END IF;

END $$;
`;

async function runMigration() {
  try {
    console.log('[Migration] Starting ServiceMaster migration...');
    console.log('[Migration] Adding servicenumber column to servicemaster table...\n');
    
    await pool.query(migration);
    
    console.log('✅ Migration completed successfully!');
    console.log('[Migration] servicenumber column added to servicemaster table');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name='servicemaster' AND column_name='servicenumber'
    `);
    
    if (result.rows.length > 0) {
      const col = result.rows[0];
      console.log(`[Migration] ✓ Column verified: ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
