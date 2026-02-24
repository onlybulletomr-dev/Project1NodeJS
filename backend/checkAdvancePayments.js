const pool = require('./config/db');

async function checkPayments() {
  try {
    console.log('=== CHECKING PAYMENT DETAILS ===\n');
    
    // Check all invoices
    const invoiceResult = await pool.query(`
      SELECT invoiceid, invoicenumber, paymentstatus, totalamount, vehicleid
      FROM invoicemaster 
      ORDER BY invoiceid DESC LIMIT 5;
    `);
    console.log('Recent Invoices:');
    invoiceResult.rows.forEach(row => {
      console.log(`  ID: ${row.invoiceid}, Number: ${row.invoicenumber}, Status: ${row.paymentstatus}, Amount: ${row.totalamount}`);
    });

    // Check all payment detail records
    console.log('\nAll Payment Detail Records:');
    const paymentResult = await pool.query(`
      SELECT paymentreceivedid, invoiceid, vehicleid, amount, notes
      FROM paymentdetail 
      ORDER BY paymentreceivedid DESC LIMIT 20;
    `);
    
    if (paymentResult.rows.length === 0) {
      console.log('  NO RECORDS FOUND');
    } else {
      paymentResult.rows.forEach(row => {
        const type = row.invoiceid === null ? 'ADVANCE' : 'PAYMENT';
        console.log(`  [${type}] ID: ${row.paymentreceivedid}, InvoiceID: ${row.invoiceid || 'NULL'}, VehicleID: ${row.vehicleid}, Amount: ${row.amount}`);
      });
    }

    // Check specifically for advance payments
    console.log('\nAdvance Payments (invoiceid IS NULL):');
    const advanceResult = await pool.query(`
      SELECT paymentreceivedid, vehicleid, amount, notes
      FROM paymentdetail 
      WHERE invoiceid IS NULL
      ORDER BY paymentreceivedid DESC;
    `);
    
    if (advanceResult.rows.length === 0) {
      console.log('  ❌ NO ADVANCE PAYMENTS FOUND');
    } else {
      console.log(`  ✓ Found ${advanceResult.rows.length} advance payment(s):`);
      advanceResult.rows.forEach(row => {
        console.log(`    ID: ${row.paymentreceivedid}, VehicleID: ${row.vehicleid}, Amount: ${row.amount}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkPayments();
