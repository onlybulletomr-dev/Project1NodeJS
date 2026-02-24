const pool = require('./config/db');

async function testPaymentStatus() {
  try {
    console.log('\n========================================');
    console.log('TESTING AUTO-STATUS LOGIC');
    console.log('========================================\n');

    // Mark one invoice as Unpaid to test with
    await pool.query(`
      UPDATE invoicemaster 
      SET paymentstatus = 'Unpaid' 
      WHERE invoiceid = 32
    `);

    console.log('✓ Set Invoice 32 status to Unpaid for testing');
    
    // Show current invoice details
    const result = await pool.query(`
      SELECT invoiceid, invoicenumber, totalamount, paymentstatus 
      FROM invoicemaster 
      WHERE invoiceid = 32
    `);
    
    const invoice = result.rows[0];
    console.log(`\nInvoice Details:`);
    console.log(`  ID: ${invoice.invoiceid}`);
    console.log(`  Number: ${invoice.invoicenumber}`);
    console.log(`  Total Amount: ₹${invoice.totalamount}`);
    console.log(`  Status: ${invoice.paymentstatus}`);

    console.log(`\nTest Scenario:`);
    console.log(`  Invoice Amount: ₹${invoice.totalamount}`);
    console.log(`  Payment You'll Make: ₹500 (less than invoice)`);
    console.log(`  Expected Status: PARTIAL ✓`);

    console.log('\n========================================');
    console.log('Ready to test! Make a payment of ₹500 on Invoice 32');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testPaymentStatus();
