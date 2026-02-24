const pool = require('./config/db');

async function verify() {
  try {
    const result = await pool.query(
      'SELECT paymentreceivedid, invoiceid, vehicleid, amount, paymentdate, notes ' +
      'FROM paymentdetail WHERE paymentreceivedid >= 29 ORDER BY paymentreceivedid'
    );

    console.log('\n✅ ADVANCE PAYMENT VERIFICATION');
    console.log('=========================================\n');

    if (result.rows.length === 0) {
      console.log('❌ NO RECORDS FOUND');
    } else {
      result.rows.forEach(row => {
        const type = row.invoiceid === null ? '🔶 ADVANCE' : '📄 INVOICE';
        const desc = row.invoiceid === null ? '(invoiceid=NULL, future use)' : '(linked to invoice)';
        
        console.log(`${type} ${desc}`);
        console.log(`  Record ID: ${row.paymentreceivedid}`);
        console.log(`  Invoice ID: ${row.invoiceid || 'NULL'}`);
        console.log(`  Vehicle ID: ${row.vehicleid}`);
        console.log(`  Amount: ₹${row.amount}`);
        console.log(`  Date: ${row.paymentdate}`);
        console.log(`  Notes: ${row.notes || 'N/A'}`);
        console.log('');
      });
    }

    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
