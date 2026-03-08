const pool = require('./backend/config/db');

async function checkAllInvoiceTimestamps() {
  try {
    console.log('\n=== ALL INVOICES IN DATABASE WITH EXACT TIMESTAMPS ===\n');

    const result = await pool.query(
      `SELECT invoiceid, invoicenumber, branchid, paymentstatus, createdat, deletedat
       FROM invoicemaster 
       ORDER BY createdat DESC`
    );

    console.log(`Total invoices: ${result.rows.length}\n`);
    
    result.rows.forEach((inv, idx) => {
      const dateStr = inv.createdat ? new Date(inv.createdat).toLocaleString('en-IN') : 'NULL';
      const status = inv.paymentstatus || 'NULL';
      const branch = inv.branchid === 2 ? 'BRANCH 2 ✓' : `Branch ${inv.branchid}`;
      console.log(`${idx + 1}. ${inv.invoicenumber.padEnd(18)} | ${branch.padEnd(11)} | Status: ${status.padEnd(8)} | Created: ${dateStr}`);
    });

    // Check current date on server
    console.log('\n=== SERVER DATE/TIME INFO ===\n');
    const dateCheck = await pool.query('SELECT NOW()::date as today, NOW() as now');
    console.log(`Today\'s Date: ${dateCheck.rows[0].today}`);
    console.log(`Current Time: ${new Date(dateCheck.rows[0].now).toLocaleString('en-IN')}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAllInvoiceTimestamps();
