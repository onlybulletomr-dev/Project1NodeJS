const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== CHECKING INVOICEMASTER TABLE SCHEMA ===\n');
    
    // Check columns
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoicemaster' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in invoicemaster:');
    schema.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name}: ${col.data_type} ${nullable}${def}`);
    });
    
    // Check constraints
    console.log('\n--- Constraints ---');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'invoicemaster' AND table_schema = 'public'
    `);
    
    constraints.rows.forEach(con => {
      console.log(`  ${con.constraint_name}: ${con.constraint_type}`);
    });
    
    // Try a simple insert test
    console.log('\n--- ATTEMPTING TEST INSERT ---');
    
    // First get a valid customer and vehicle for Branch 2
    const custRes = await pool.query(
      'SELECT customerid FROM customermaster WHERE branchid = 2 AND deletedat IS NULL LIMIT 1'
    );
    const vehRes = await pool.query(
      'SELECT vehicleid, vehiclenumber FROM vehicledetail WHERE branchid = 2 AND deletedat IS NULL LIMIT 1'
    );
    
    if (custRes.rows.length === 0 || vehRes.rows.length === 0) {
      console.log('❌ No valid customer or vehicle for Branch 2');
    } else {
      const customerId = custRes.rows[0].customerid;
      const vehicleId = vehRes.rows[0].vehicleid;
      const vehicleNumber = vehRes.rows[0].vehiclenumber;
      
      console.log(`Using Customer ${customerId}, Vehicle ${vehicleId} (${vehicleNumber})`);
      
      try {
        const insertResult = await pool.query(
          `INSERT INTO invoicemaster (
            invoicenumber, branchid, customerid, vehicleid, vehiclenumber, jobcardid,
            invoicedate, duedate, invoicetype,
            subtotal, totaldiscount, partsincome, serviceincome, tax1, tax2, totalamount,
            technicianmain, technicianassistant, waterwash, serviceadvisorin, serviceadvisordeliver,
            testdriver, cleaner, additionalwork,
            odometer, notes, notes1, paymentstatus, createdby, createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
          RETURNING *`,
          [
            'TEST26MAR999', 2, customerId, vehicleId, vehicleNumber, 0,
            new Date().toISOString().split('T')[0], null, 'Service Invoice',
            1000, 50, 0, 0, 0, 0, 950,
            null, null, null, null, null,
            null, null, null,
            null, 'Test', null, 'Pending', 1, new Date().toISOString().split('T')[0]
          ]
        );
        
        console.log('✓ Test insert successful!');
        console.log('  Invoice ID:', insertResult.rows[0].invoiceid);
        console.log('  Invoice #:', insertResult.rows[0].invoicenumber);
        
        // Clean up
        await pool.query('DELETE FROM invoicemaster WHERE invoicenumber = $1', ['TEST26MAR999']);
        console.log('Test record deleted');
      } catch (err) {
        console.log('❌ Insert failed:', err.message);
      }
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
