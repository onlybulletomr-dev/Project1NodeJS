const pool = require('./config/db');

async function checkLatestPayments() {
  try {
    console.log('=== CHECKING LATEST PAYMENT RECORDS ===\n');

    // Check the most recent payment records
    const result = await pool.query(`
      SELECT 
        paymentreceivedid, 
        invoiceid, 
        amount, 
        notes,
        createdat
      FROM paymentdetail
      WHERE notes LIKE '%test%' OR notes LIKE '%Correct%'
      ORDER BY paymentreceivedid DESC
      LIMIT 10
    `);

    console.log('Payment Records:');
    result.rows.forEach(row => {
      const inv = row.invoiceid === null ? 'NULL (ADVANCE)' : row.invoiceid;
      console.log(`
ID=${row.paymentreceivedid}
Invoice=${inv}  
Amount=₹${row.amount}
Notes=${row.notes}
Created=${row.createdat}
---`);
    });

    // Calculate totals
    const invoiceRecords = result.rows.filter(r => r.invoiceid !== null);
    const advanceRecords = result.rows.filter(r => r.invoiceid === null);
    
    const invoiceSum = invoiceRecords.reduce((sum, r) => sum + Number(r.amount), 0);
    const advanceSum = advanceRecords.reduce((sum, r) => sum + Number(r.amount), 0);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Invoice Payments Total: ₹${invoiceSum.toFixed(2)}`);
    console.log(`Advance Payments Total: ₹${advanceSum.toFixed(2)}`);
    console.log(`Grand Total: ₹${(invoiceSum + advanceSum).toFixed(2)}`);

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

checkLatestPayments();
