const pool = require('./config/db');

async function fixInvoiceVehicleIds() {
  try {
    console.log('========================================');
    console.log('FIXING INVOICE VEHICLE IDS');
    console.log('========================================\n');

    // Get the first valid vehicle ID
    const vehicleQuery = 'SELECT vehicledetailid FROM vehicledetail WHERE deletedat IS NULL LIMIT 1';
    const vehicleResult = await pool.query(vehicleQuery);
    
    if (!vehicleResult.rows.length) {
      console.log('ERROR: No valid vehicles found in database');
      process.exit(1);
    }

    const validVehicleId = vehicleResult.rows[0].vehicledetailid;
    console.log(`Using valid vehicle ID: ${validVehicleId}\n`);

    // Fix invoices with invalid vehicle IDs
    const checkQuery = 'SELECT DISTINCT vehicleid FROM invoicemaster WHERE deletedat IS NULL';
    const checkResult = await pool.query(checkQuery);
    
    console.log('Current vehicle IDs in invoices:');
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.vehicleid}`);
    });

    // Update invoices with invalid vehicleids
    const updateQuery = `
      UPDATE invoicemaster 
      SET vehicleid = $1 
      WHERE vehicleid NOT IN (
        SELECT vehicledetailid FROM vehicledetail WHERE deletedat IS NULL
      ) AND deletedat IS NULL
    `;
    
    const updateResult = await pool.query(updateQuery, [validVehicleId]);
    console.log(`\nUpdated ${updateResult.rowCount} invoices with invalid vehicle IDs\n`);

    // Verify the fix
    console.log('After fix:');
    const verifyResult = await pool.query(`
      SELECT invoiceid, vehicleid, totalamount, paymentstatus 
      FROM invoicemaster 
      WHERE deletedat IS NULL 
      ORDER BY invoiceid
    `);
    
    verifyResult.rows.forEach(row => {
      console.log(`  Invoice ${row.invoiceid}: vehicleid=${row.vehicleid} | ₹${row.totalamount} | ${row.paymentstatus}`);
    });

    console.log('\n========================================');
    console.log('✓ FIX COMPLETE');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixInvoiceVehicleIds();
