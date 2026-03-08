const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== ALL INVOICES IN SYSTEM ===\n');
    
    const res = await pool.query(
      'SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid, customerid FROM invoicemaster ORDER BY invoiceid DESC LIMIT 30'
    );
    
    if (res.rows.length === 0) {
      console.log('No invoices found');
    } else {
      console.log(`Total shown: ${res.rows.length} recent invoices\n`);
      res.rows.forEach((inv, i) => {
        const status = inv.deletedat ? '❌ DELETED' : inv.paymentstatus || 'Unpaid';
        console.log(`${i+1}. ${inv.invoicenumber} | Status: ${status} | Branch: ${inv.branchid}`);
      });
    }
    
    // Also check for any invoices with "MAR" in them
    console.log('\n=== INVOICES WITH "MAR" IN NUMBER ===\n');
    const marRes = await pool.query(
      "SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid FROM invoicemaster WHERE invoicenumber LIKE '%MAR%' ORDER BY invoicenumber DESC"
    );
    
    if (marRes.rows.length === 0) {
      console.log('No MAR invoices found');
    } else {
      console.log(`Found ${marRes.rows.length} MAR invoices:\n`);
      marRes.rows.forEach((inv) => {
        const status = inv.deletedat ? '❌ DELETED' : inv.paymentstatus || 'Unpaid';
        console.log(`  ${inv.invoicenumber} | ${status} | Branch: ${inv.branchid}`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
