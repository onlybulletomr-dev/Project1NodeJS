const pool = require('./config/db');

async function runTest() {
  try {
    console.log('Resetting invoice 32 to Unpaid for testing...');
    await pool.query('UPDATE invoicemaster SET paymentstatus = $1 WHERE invoiceid = 32', ['Unpaid']);
    console.log('✓ Invoice 32 status set to Unpaid\n');

    console.log('Making payment of 2500 for invoice worth 1210 (overpayment of 1290)...');
    console.log('This should create:');
    console.log('  1. Payment record (invoiceid=32, amount=2500)');
    console.log('  2. Advance record (invoiceid=NULL, amount=1290)\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTest();
