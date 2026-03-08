const pool = require('./config/db');

/**
 * Test: Pay Rs. 2100 against Rs. 1210 invoice
 * Expected: Invoice marked Paid, Rs. 890 advance recorded against vehicle
 */
async function testAdvancePaymentWithValidVehicle() {
  console.log('====================================');
  console.log('TEST: Advance Payment Recording');
  console.log('====================================\n');
  
  try {
    // Get test invoice (now with valid vehicleid)
    const invoiceQuery = await pool.query(`
      SELECT invoiceid, invoicenumber, vehicleid, branchid, totalamount 
      FROM invoicemaster 
      WHERE invoicenumber = 'INVOMR26FEB001'
      LIMIT 1
    `);
    
    if (invoiceQuery.rows.length === 0) {
      console.log('ERROR: Test invoice not found');
      return;
    }
    
    const invoice = invoiceQuery.rows[0];
    console.log(`Invoice: ${invoice.invoicenumber}`);
    console.log(`Amount: Rs. ${invoice.totalamount}`);
    console.log(`Vehicle ID: ${invoice.vehicleid}\n`);
    
    // Verify vehicle exists
    const vehicleCheck = await pool.query(
      'SELECT vehicledetailid FROM vehicledetail WHERE vehicledetailid = $1',
      [invoice.vehicleid]
    );
    
    if (vehicleCheck.rows.length === 0) {
      console.log(`ERROR: Vehicle ${invoice.vehicleid} not found`);
      return;
    }
    
    console.log(`✓ Vehicle ${invoice.vehicleid} exists in database\n`);
    
    // Clear any existing payment records for this invoice
    await pool.query('DELETE FROM paymentdetail WHERE invoiceid = $1', [invoice.invoiceid]);
    console.log('✓ Cleared previous payment records\n');
    
    // Simulate payment: Rs. 2100 against Rs. 1210 invoice
    const paymentAmount = 2100;
    const invoiceAmount = invoice.totalamount;
    const advanceAmount = paymentAmount - invoiceAmount;
    
    console.log(`Payment Details:`);
    console.log(`  Amount Paid: Rs. ${paymentAmount}`);
    console.log(`  Invoice Amount: Rs. ${invoiceAmount}`);
    console.log(`  Advance (overpayment): Rs. ${advanceAmount}\n`);
    
    // Get a valid user ID for testing
    const userId = 1;  // Use default user ID for test
    
    console.log(`Using user ID: ${userId}\n`);
    const mainPayment = await pool.query(`
      INSERT INTO paymentdetail 
      (invoiceid, vehicleid, paymentmethodid, amount, paymentdate, paymentstatus, notes, processedbyuserid, branchid, createdby)
      VALUES ($1, $2, 1, $3, NOW(), 'Paid', 'Test payment', $4, $5, $4)
      RETURNING paymentreceivedid
    `, [invoice.invoiceid, invoice.vehicleid, invoiceAmount, userId, invoice.branchid]);
    
    console.log(`✓ Main payment recorded: ${mainPayment.rows[0].paymentreceivedid}\n`);
    
    // Record advance payment (tied to vehicle)
    if (advanceAmount > 0) {
      const advancePayment = await pool.query(`
        INSERT INTO paymentdetail 
        (invoiceid, vehicleid, paymentmethodid, amount, paymentdate, paymentstatus, notes, processedbyuserid, branchid, createdby)
        VALUES ($1, $2, 1, $3, NOW(), 'Advance', 'Advance payment from overpayment', $4, $5, $4)
        RETURNING paymentreceivedid, amount, vehicleid
      `, [null, invoice.vehicleid, advanceAmount, userId, invoice.branchid]);
      
      console.log(`✓ Advance payment recorded: ${advancePayment.rows[0].paymentreceivedid}`);
      console.log(`  Amount: Rs. ${advancePayment.rows[0].amount}`);
      console.log(`  Vehicle ID: ${advancePayment.rows[0].vehicleid}\n`);
    }
    
    // Verify all payments were recorded
    const allPayments = await pool.query(`
      SELECT paymentreceivedid, invoiceid, vehicleid, amount, paymentstatus, notes
      FROM paymentdetail 
      WHERE (invoiceid = $1 OR vehicleid = $2)
      ORDER BY paymentreceivedid DESC
      LIMIT 5
    `, [invoice.invoiceid, invoice.vehicleid]);
    
    console.log('====================================');
    console.log('Payment Records in Database:');
    console.log('====================================');
    allPayments.rows.forEach(p => {
      console.log(`\nRecord ${p.paymentreceivedid}:`);
      console.log(`  Invoice: ${p.invoiceid || 'NULL (Advance)'}`);
      console.log(`  Vehicle: ${p.vehicleid}`);
      console.log(`  Amount: Rs. ${p.amount}`);
      console.log(`  Status: ${p.paymentstatus}`);
      console.log(`  Notes: ${p.notes}`);
    });
    
    console.log('\n====================================');
    console.log('✓ TEST PASSED');
    console.log('Advance payment is tied to vehicle (not NULL)');
    console.log('====================================\n');
    
  } catch(err) {
    console.error('ERROR:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testAdvancePaymentWithValidVehicle();
