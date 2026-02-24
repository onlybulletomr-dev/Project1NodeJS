const pool = require('./config/db');

async function checkPaymentDetails() {
  try {
    const result = await pool.query(`
      SELECT paymentreceivedid, invoiceid, vehicleid, amount, paymentdate, notes
      FROM paymentdetail
      ORDER BY paymentreceivedid DESC
      LIMIT 5;
    `);
    
    console.log('=== PAYMENT DETAIL TABLE (Last 5 Records) ===\n');
    
    if(result.rows.length === 0) {
      console.log('❌ NO PAYMENT RECORDS FOUND!');
    } else {
      result.rows.forEach(row => {
        const invMarker = row.invoiceid === null ? '🔶 ADVANCE' : '📄 INVOICE';
        console.log(`${invMarker} | ID: ${row.paymentreceivedid} | InvoiceID: ${row.invoiceid || 'NULL'} | VehicleID: ${row.vehicleid} | Amount: ₹${row.amount}`);
      });
    }
    
    // Check for recent advances (invoiceid = NULL)
    const advancesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM paymentdetail
      WHERE invoiceid IS NULL;
    `);
    console.log(`\n✅ Total Advance records (invoiceid=NULL): ${advancesResult.rows[0].count}`);
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkPaymentDetails();
