const pool = require('./backend/config/db');

async function checkMAR() {
  const result = await pool.query(
    `SELECT invoicenumber, paymentstatus, branchid FROM invoicemaster WHERE invoicenumber LIKE '%MAR%'`
  );
  console.log('All invoices with MAR:');
  result.rows.forEach(r => {
    console.log(`  ${r.invoicenumber} - Branch ${r.branchid} - Status: ${r.paymentstatus || 'NULL'}`);
  });
  if (result.rows.length === 0) {
    console.log('  (none found)');
  }
  await pool.end();
}

checkMAR();
