const pool = require('./config/db');

async function fixData() {
  try {
    // Find all invoices with invalid vehicleids
    console.log('Finding invoices with non-existent vehicleids...');
    
    const badInvoices = await pool.query(`
      SELECT DISTINCT im.vehicleid 
      FROM invoicemaster im
      WHERE im.deletedat IS NULL 
      AND NOT EXISTS (
        SELECT 1 FROM vehicledetail vd 
        WHERE vd.vehicledetailid = im.vehicleid AND vd.deletedat IS NULL
      )
    `);
    
    console.log('Invalid vehicleids:', badInvoices.rows.map(r => r.vehicleid));
    
    // For each invalid vehicleid, find invoices and fix them
    for (const row of badInvoices.rows) {
      const badVehicleId = row.vehicleid;
      console.log(`\nFixing invoices with vehicleid=${badVehicleId}`);
      
      // Get invoices with bad vehicleid
      const invoices = await pool.query(
        `SELECT DISTINCT customerid FROM invoicemaster 
         WHERE vehicleid = $1 AND deletedat IS NULL LIMIT 1`,
        [badVehicleId]
      );
      
      if (invoices.rows.length > 0) {
        const customerid = invoices.rows[0].customerid;
        console.log(`  Customer ID: ${customerid}`);
        
        // Get first valid vehicledetailid for this customer
        const validVehicles = await pool.query(
          `SELECT vehicledetailid FROM vehicledetail 
           WHERE customerid = $1 AND deletedat IS NULL LIMIT 1`,
          [customerid]
        );
        
        if (validVehicles.rows.length > 0) {
          const validVehicleId = validVehicles.rows[0].vehicledetailid;
          console.log(`  Mapping to vehicledetailid: ${validVehicleId}`);
          
          const updateResult = await pool.query(
            `UPDATE invoicemaster 
             SET vehicleid = $1 
             WHERE vehicleid = $2 AND deletedat IS NULL`,
            [validVehicleId, badVehicleId]
          );
          console.log(`  Updated ${updateResult.rowCount} invoices`);
        }
      }
    }
    
    console.log('\n=== Verification ===');
    const check = await pool.query(`
      SELECT DISTINCT im.vehicleid 
      FROM invoicemaster im
      WHERE im.deletedat IS NULL 
      AND NOT EXISTS (
        SELECT 1 FROM vehicledetail vd 
        WHERE vd.vehicledetailid = im.vehicleid AND vd.deletedat IS NULL
      )
    `);
    console.log('Remaining invalid vehicleids:', check.rows.length === 0 ? 'NONE' : check.rows.map(r => r.vehicleid));
    
  } catch(err) { 
    console.error('Error:', err.message); 
  }
  process.exit(0);
}

fixData();
