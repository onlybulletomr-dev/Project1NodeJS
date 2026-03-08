const pool = require('./config/db');

(async() => {
  const res = await pool.query('SELECT invoiceid, invoicenumber, branchid, paymentstatus FROM invoicemaster ORDER BY createdat DESC LIMIT 15');
  console.log('\n=== LATEST INVOICES IN DATABASE ===\n');
  res.rows.forEach((r, i) => console.log(`${i+1}. ${r.invoicenumber} | Branch ${r.branchid} | ${r.paymentstatus}`));
  
  // Check specifically for PBM invoices
  const pbmRes = await pool.query('SELECT invoiceid, invoicenumber, branchid, totalamount FROM invoicemaster WHERE invoicenumber LIKE $1 ORDER BY createdat DESC', ['PBM%']);
  console.log(`\n=== PBM INVOICES (BRANCH 2) ===\n`);
  if (pbmRes.rows.length === 0) {
    console.log('No PBM invoices found');
  } else {
    pbmRes.rows.forEach((r, i) => console.log(`${i+1}. ${r.invoicenumber} | ₹${r.totalamount}`));
  }
  
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
