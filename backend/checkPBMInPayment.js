const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== CHECKING INVOICE PBM26MAR001 (CASE INSENSITIVE) ===\n');
    
    // Case insensitive search
    const res = await pool.query(
      'SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid, customerid, totalamount, createdat FROM invoicemaster WHERE LOWER(invoicenumber) = LOWER($1)',
      ['PBM26MAR001']
    );
    
    if (res.rows.length === 0) {
      console.log('❌ Still NOT FOUND (even case-insensitive)\n');
      console.log('Searching for similar invoices...');
      const similar = await pool.query(
        "SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid FROM invoicemaster WHERE invoicenumber LIKE '%PBM%' OR invoicenumber LIKE '%26MAR%' ORDER BY invoiceid DESC"
      );
      
      if (similar.rows.length > 0) {
        console.log(`Found ${similar.rows.length} similar invoices:`);
        similar.rows.forEach(inv => {
          console.log(`  ${inv.invoicenumber} | ${inv.paymentstatus} | Deleted: ${inv.deletedat ? 'YES' : 'NO'} | Branch: ${inv.branchid}`);
        });
      } else {
        console.log('No similar invoices found');
      }
    } else {
      const invoice = res.rows[0];
      console.log('✓ Invoice FOUND!');
      console.log('  Invoice ID:', invoice.invoiceid);
      console.log('  Invoice Number:', invoice.invoicenumber);
      console.log('  Payment Status:', invoice.paymentstatus);
      console.log('  Is Deleted:', invoice.deletedat ? 'YES ❌' : 'NO ✓');
      console.log('  Branch ID:', invoice.branchid);
      console.log('  Total Amount:', invoice.totalamount);
      console.log('  Created:', invoice.createdat);
      
      // Check why it's not showing in payment screen
      console.log('\n--- CHECKING PAYMENT SCREEN QUERY CONDITIONS ---');
      
      // Test the payment screen query conditions
      const paymentQuery = `
        SELECT 
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
          AND LOWER(im.invoicenumber) = LOWER($1)
        ORDER BY im.createdat DESC
      `;
      
      const paymentRes = await pool.query(paymentQuery, ['PBM26MAR001']);
      
      if (paymentRes.rows.length > 0) {
        console.log('✓ Shows in payment query!');
        console.log('  Amount:', paymentRes.rows[0].totalamount);
        console.log('  Paid:', paymentRes.rows[0].amountpaid);
      } else {
        console.log('❌ Does NOT show in payment query');
        console.log('Checking conditions:');
        
        // Check each condition
        const condRes = await pool.query(
          'SELECT invoiceid, invoicenumber, paymentstatus, deletedat FROM invoicemaster WHERE LOWER(invoicenumber) = LOWER($1)',
          ['PBM26MAR001']
        );
        console.log(`  - deletedat IS NULL: ${condRes.rows[0]?.deletedat === null ? 'YES ✓' : 'NO ❌'}`);
        console.log(`  - Found in query: ${condRes.rows.length > 0 ? 'YES ✓' : 'NO ❌'}`);
      }
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
