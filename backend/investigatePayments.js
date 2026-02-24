const pool = require('./config/db');

async function investigatePayments() {
  try {
    console.log('=== INVESTIGATING PAYMENT ISSUE ===\n');

    // Get invoice 34 details
    const invoiceResult = await pool.query(
      'SELECT invoiceid, invoicenumber, totalamount FROM invoicemaster WHERE invoiceid = 34'
    );
    
    if (invoiceResult.rows.length === 0) {
      console.log('Invoice 34 not found');
      process.exit(0);
    }

    const invoice = invoiceResult.rows[0];
    console.log('Invoice 34 Details:');
    console.log(`  Number: ${invoice.invoicenumber}`);
    console.log(`  Amount: ₹${invoice.totalamount}`);

    // Get all payment records for invoice 34
    const paymentResult = await pool.query(`
      SELECT 
        paymentreceivedid, 
        invoiceid, 
        amount, 
        createdat,
        notes
      FROM paymentdetail
      WHERE invoiceid = 34 OR (invoiceid IS NULL AND notes LIKE '%INV26FEB003%')
      ORDER BY paymentreceivedid DESC
      LIMIT 10
    `);

    console.log('\n=== Payment Records for Invoice 34 ===');
    paymentResult.rows.forEach(row => {
      const inv = row.invoiceid === null ? 'NULL (ADVANCE)' : row.invoiceid;
      console.log(`
ID: ${row.paymentreceivedid}
Invoice: ${inv}
Amount: ₹${row.amount}
Created: ${row.createdat}
Notes: ${row.notes}
---`);
    });

    console.log('\n=== EXPECTED vs ACTUAL ===');
    const invoicePayments = paymentResult.rows.filter(r => r.invoiceid === 34);
    const advancePayments = paymentResult.rows.filter(r => r.invoiceid === null);

    const invoiceTotal = invoicePayments.reduce((sum, r) => sum + Number(r.amount), 0);
    const advanceTotal = advancePayments.reduce((sum, r) => sum + Number(r.amount), 0);

    console.log(`Expected Invoice Payment: ₹1290.00`);
    console.log(`Actual Invoice Payment: ₹${invoiceTotal.toFixed(2)}`);
    console.log(`Expected Advance: ₹1000.00`);
    console.log(`Actual Advance: ₹${advanceTotal.toFixed(2)}`);
    console.log(`Total Expected: ₹2290.00`);
    console.log(`Total Actual: ₹${(invoiceTotal + advanceTotal).toFixed(2)}`);

    if (invoiceTotal === 1290 && advanceTotal === 1000) {
      console.log('\n✅ CORRECT! Records are as expected.');
    } else {
      console.log('\n❌ ERROR! Records do not match expected values.');
    }

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

investigatePayments();
