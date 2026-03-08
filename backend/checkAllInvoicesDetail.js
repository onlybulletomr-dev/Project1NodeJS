const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== ALL INVOICES IN DATABASE ===\n');
    
    const all = await pool.query(
      'SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid, totalamount, createdat FROM invoicemaster ORDER BY createdat DESC'
    );
    
    console.log(`Total invoices: ${all.rows.length}\n`);
    
    all.rows.forEach((inv, i) => {
      const deleted = inv.deletedat ? '❌ DELETED' : '✓';
      console.log(`${i+1}. ${inv.invoicenumber} | Status: ${inv.paymentstatus} | Amount: ₹${inv.totalamount} | Branch: ${inv.branchid} | ${deleted}`);
    });
    
    // Check if any invoice contains "MAR001"
    console.log('\n--- Searching for "MAR001" ---');
    const mar001 = all.rows.filter(inv => inv.invoicenumber.includes('MAR001'));
    if (mar001.length > 0) {
      console.log('Found invoices with MAR001:');
      mar001.forEach(inv => console.log(`  ${inv.invoicenumber}`));
    } else {
      console.log('No invoices with MAR001 found');
    }
    
    // Check today's date invoices
    console.log('\n--- Invoices created TODAY (7/3/2026) ---');
    const today = all.rows.filter(inv => {
      const created = new Date(inv.createdat);
      return created.toLocaleDateString('en-IN') === '7/3/2026';
    });
    console.log(`Found ${today.length} invoice(s) created today`);
    today.forEach(inv => {
      console.log(`  ${inv.invoicenumber} | ${inv.paymentstatus} | ₹${inv.totalamount}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
