const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== VERIFYING INVOICE PBM26MAR001 ===\n');
    
    // Search for PBM26MAR001
    const res = await pool.query(
      'SELECT invoiceid, invoicenumber, branchid, totalamount, totaldiscount, paymentstatus, createdat FROM invoicemaster WHERE invoicenumber = $1',
      ['PBM26MAR001']
    );
    
    if (res.rows.length > 0) {
      const inv = res.rows[0];
      console.log('✓ INVOICE FOUND IN DATABASE:\n');
      console.log('  Invoice #:', inv.invoicenumber);
      console.log('  Branch:', inv.branchid);
      console.log('  Amount:', inv.totalamount);
      console.log('  Discount:', inv.totaldiscount);
      console.log('  Status:', inv.paymentstatus);
      console.log('  Created:', inv.createdat);
      
      // Check if it will appear in payment screen
      console.log('\n--- CHECKING PAYMENT SCREEN VISIBILITY ---');
      
      const paymentRes = await pool.query(
        `SELECT 
          im.invoiceid, im.invoicenumber, im.paymentstatus,
          COALESCE(im.totalamount, 0) AS totalamount,
          COALESCE(totals.amountpaid, 0) AS amountpaid
        FROM invoicemaster im
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(CASE WHEN p2.paymentstatus IN ('Paid', 'Completed') THEN p2.amount ELSE 0 END), 0) AS amountpaid
          FROM paymentdetail p2
          WHERE p2.invoiceid = im.invoiceid AND p2.deletedat IS NULL
        ) totals ON TRUE
        WHERE im.deletedat IS NULL
          AND im.invoicenumber = $1
        ORDER BY im.createdat DESC`,
        ['PBM26MAR001']
      );
      
      if (paymentRes.rows.length > 0) {
        console.log('✓ Invoice WILL APPEAR in Payment screen');
        const p = paymentRes.rows[0];
        console.log(`  Total Amount: ₹${p.totalamount}`);
        console.log(`  Amount Paid: ₹${p.amountpaid}`);
        console.log(`  Amount Due: ₹${p.totalamount - p.amountpaid}`);
      } else {
        console.log('❌ Invoice will NOT appear in Payment screen');
      }
    } else {
      console.log('❌ Invoice PBM26MAR001 NOT found in database');
      console.log('\nShowing all recent invoices:');
      const allRes = await pool.query(
        'SELECT invoiceid, invoicenumber, branchid, paymentstatus FROM invoicemaster ORDER BY createdat DESC LIMIT 10'
      );
      allRes.rows.forEach((inv, i) => {
        console.log(`  ${i+1}. ${inv.invoicenumber} | Branch: ${inv.branchid} | Status: ${inv.paymentstatus}`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
