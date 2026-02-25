const { Pool } = require('pg');
require('dotenv').config();

async function renameTableOnRender() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('[RenderMigration] Connecting to Render database...');
    const client = await pool.connect();
    
    console.log('[RenderMigration] Checking for vehicledetails table...');
    
    // First check what tables exist
    const allTablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const allTables = allTablesRes.rows.map(r => r.table_name);
    console.log('[RenderMigration] Tables in database:', allTables);
    
    const hasVehicledetails = allTables.includes('vehicledetails');
    const hasVehicledetail = allTables.includes('vehicledetail');
    
    console.log(`[RenderMigration] vehicledetails exists: ${hasVehicledetails}`);
    console.log(`[RenderMigration] vehicledetail exists: ${hasVehicledetail}`);
    
    if (!hasVehicledetails && hasVehicledetail) {
      console.log('[RenderMigration] ✓ Table is already named vehicledetail - no action needed');
      client.release();
      await pool.end();
      process.exit(0);
    }
    
    if (!hasVehicledetails) {
      console.log('[RenderMigration] ✗ Neither vehicledetails nor vehicledetail found!');
      client.release();
      await pool.end();
      process.exit(1);
    }
    
    // Now run the migration
    console.log('[RenderMigration] Starting rename migration...');
    
    try {
      console.log('[RenderMigration] Step 1: Dropping foreign key if it exists...');
      await client.query(`
        ALTER TABLE IF EXISTS invoicemaster
        DROP CONSTRAINT IF EXISTS invoicemaster_vehicleid_fkey;
      `);
      console.log('[RenderMigration] ✓ Foreign key constraint dropped');
    } catch (fkErr) {
      console.log('[RenderMigration] Note: FK drop had issue (expected):', fkErr.message);
    }
    
    console.log('[RenderMigration] Step 2: Renaming vehicledetails → vehicledetail...');
    await client.query(`
      ALTER TABLE vehicledetails RENAME TO vehicledetail;
    `);
    console.log('[RenderMigration] ✓ Table renamed successfully');
    
    console.log('[RenderMigration] Step 3: Adding foreign key constraint back...');
    await client.query(`
      ALTER TABLE invoicemaster
      ADD CONSTRAINT invoicemaster_vehicleid_fkey
      FOREIGN KEY (vehicleid) REFERENCES vehicledetail(vehicleid);
    `);
    console.log('[RenderMigration] ✓ Foreign key recreated');
    
    // Verify
    const finalCheckRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('vehicledetail', 'vehicledetails')
      AND table_schema = 'public'
    `);
    
    const finalTables = finalCheckRes.rows.map(r => r.table_name);
    console.log('[RenderMigration] Final table state:', finalTables);
    
    const countRes = await client.query('SELECT COUNT(*) as count FROM vehicledetail');
    const count = countRes.rows[0].count;
    
    console.log('[RenderMigration] ✅ Migration successful! Vehicle records:', count);
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[RenderMigration ERROR]', error.message);
    console.error('[RenderMigration Stack]', error.stack);
    await pool.end();
    process.exit(1);
  }
}

renameTableOnRender();
