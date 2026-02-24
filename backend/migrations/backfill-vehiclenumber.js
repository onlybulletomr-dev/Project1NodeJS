const pool = require('../config/db');

/**
 * Migration: Backfill invoicemaster.vehiclenumber from vehicledetail table
 * For existing invoices with NULL vehiclenumber but valid vehicleid,
 * populate vehiclenumber from the corresponding vehicle record
 */

async function backfillVehicleNumbers() {
  const client = await pool.connect();
  
  try {
    console.log('Starting vehiclenumber backfill migration...');
    
    // Step 1: Check how many invoices need updating
    const checkResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM invoicemaster im 
       WHERE (im.vehiclenumber IS NULL OR TRIM(im.vehiclenumber) = '') 
       AND im.vehicleid IS NOT NULL
       AND im.deletedat IS NULL`
    );
    
    const count = parseInt(checkResult.rows[0].count);
    console.log(`Found ${count} invoices with NULL/empty vehiclenumber that need updating`);
    
    if (count === 0) {
      console.log('No invoices need updating. Migration complete.');
      return true;
    }
    
    // Step 2: Update invoices by joining with vehicledetail
    // First, find invoices where vehicleid might not match vehicledetail directly
    // We'll use a LEFT JOIN to get vehiclenumber from vehicledetail
    const updateResult = await client.query(
      `UPDATE invoicemaster im
       SET vehiclenumber = vd.vehiclenumber,
           updatedat = CURRENT_DATE,
           updatedby = 1
       FROM vehicledetail vd
       WHERE im.vehicleid = vd.vehicledetailid
       AND (im.vehiclenumber IS NULL OR TRIM(im.vehiclenumber) = '')
       AND im.vehicleid IS NOT NULL
       AND im.deletedat IS NULL
       AND vd.deletedat IS NULL`
    );
    
    console.log(`Updated ${updateResult.rowCount} invoices with vehiclenumber from vehicledetail`);
    
    // Step 3: Verify the update
    const verifyResult = await client.query(
      `SELECT COUNT(*) as still_null
       FROM invoicemaster im
       WHERE (im.vehiclenumber IS NULL OR TRIM(im.vehiclenumber) = '')
       AND im.vehicleid IS NOT NULL
       AND im.deletedat IS NULL`
    );
    
    const stillNull = parseInt(verifyResult.rows[0].still_null);
    console.log(`Verification: ${stillNull} invoices still have NULL/empty vehiclenumber`);
    
    if (stillNull > 0) {
      console.log('Warning: Some invoices could not be updated. They may have invalid vehicleid references.');
      
      // Show samples of problem invoices
      const problemSample = await client.query(
        `SELECT invoiceid, invoicenumber, vehicleid, vehiclenumber
         FROM invoicemaster
         WHERE (vehiclenumber IS NULL OR TRIM(vehiclenumber) = '')
         AND vehicleid IS NOT NULL
         AND deletedat IS NULL
         LIMIT 5`
      );
      
      console.log('Sample of invoices that still have NULL vehiclenumber:');
      console.table(problemSample.rows);
    }
    
    // Step 4: Show sample of updated invoices  
    const sample = await client.query(
      `SELECT invoiceid, invoicenumber, vehicleid, vehiclenumber
       FROM invoicemaster
       WHERE vehiclenumber IS NOT NULL 
       AND TRIM(vehiclenumber) != ''
       AND deletedat IS NULL
       ORDER BY invoiceid DESC
       LIMIT 5`
    );
    
    console.log('Sample of updated invoices:');
    console.table(sample.rows);
    
    console.log('Migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    client.release();
  }
}

// Run the migration
backfillVehicleNumbers().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
