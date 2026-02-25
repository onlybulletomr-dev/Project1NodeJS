// Add customerid column to vehicledetail on Render and populate from invoices
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function addCustomerIdColumn() {
  try {
    console.log('Adding customerid column to vehicledetail table...\n');
    
    // First, check if column already exists
    const checkCol = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='vehicledetail' AND column_name='customerid'
    `);
    
    if (checkCol.rows.length > 0) {
      console.log('✅ customerid column already exists');
    } else {
      console.log('Adding customerid column...');
      await pool.query(`
        ALTER TABLE vehicledetail ADD COLUMN customerid INTEGER;
      `);
      console.log('✅ customerid column added');
    }
    
    // Now populate customerid from invoicemaster
    console.log('\nPopulating customerid from invoicemaster...');
    
    const updateResult = await pool.query(`
      UPDATE vehicledetail vd
      SET customerid = im.customerid
      FROM invoicemaster im
      WHERE vd.vehicleid = im.vehicleid 
        AND vd.customerid IS NULL
        AND im.customerid IS NOT NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} records from invoicemaster`);
    
    // Check for any vehicles still missing customerid
    const missingCount = await pool.query(`
      SELECT COUNT(*) as count FROM vehicledetail WHERE customerid IS NULL AND deletedat IS NULL
    `);
    
    console.log(`\nRemaining vehicles without customerid: ${missingCount.rows[0].count}`);
    
    // Show sample data
    console.log('\nSample vehicledetail records with customerid:');
    const sample = await pool.query(`
      SELECT vehicleid, registrationnumber, model, color, customerid
      FROM vehicledetail
      WHERE customerid IS NOT NULL AND deletedat IS NULL
      LIMIT 5
    `);
    
    sample.rows.forEach(row => {
      console.log(`  - ID: ${row.vehicleid}, Reg: ${row.registrationnumber}, Model: ${row.model}, CustID: ${row.customerid}`);
    });
    
    await pool.end();
    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (pool) await pool.end();
    process.exit(1);
  }
}

addCustomerIdColumn();
