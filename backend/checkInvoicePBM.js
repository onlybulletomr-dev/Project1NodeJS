const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== CHECKING INVOICE PBM26MAR001 ===\n');
    
    const res = await pool.query(
      'SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid, customerid, totalamount FROM invoicemaster WHERE invoicenumber = $1',
      ['PBM26MAR001']
    );
    
    if (res.rows.length === 0) {
      console.log('❌ Invoice PBM26MAR001 NOT FOUND');
    } else {
      const invoice = res.rows[0];
      console.log('✓ Invoice Found:');
      console.log('  Invoice Number:', invoice.invoicenumber);
      console.log('  Invoice ID:', invoice.invoiceid);
      console.log('  Payment Status:', invoice.paymentstatus || 'NULL');
      console.log('  Is Deleted:', invoice.deletedat ? 'YES ❌' : 'NO ✓');
      console.log('  Branch ID:', invoice.branchid);
      console.log('  Total Amount:', invoice.totalamount);
      
      // Check payment records
      console.log('\n--- Payment Records ---');
      const paymentRes = await pool.query(
        'SELECT paymentreceivedid, amount, paymentstatus, deletedat FROM paymentdetail WHERE invoiceid = $1',
        [invoice.invoiceid]
      );
      
      if (paymentRes.rows.length === 0) {
        console.log('No payment records');
      } else {
        console.log(`Found ${paymentRes.rows.length} payment record(s):`);
        paymentRes.rows.forEach((p, i) => {
          console.log(`  Payment ${i+1}: $${p.amount}, Status: ${p.paymentstatus}, Deleted: ${p.deletedat ? 'YES' : 'NO'}`);
        });
      }
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
