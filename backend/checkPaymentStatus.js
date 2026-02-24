const pool = require('./config/db');

async function check() {
  try {
    // Check all payment statuses
    const result = await pool.query(
      'SELECT invoiceid, invoicenumber, totalamount, paymentstatus FROM invoicemaster ORDER BY invoiceid DESC LIMIT 10;'
    );
    
    console.log('=== INVOICE PAYMENT STATUS ===\n');
    result.rows.forEach(row => {
      console.log(`ID: ${row.invoiceid} | Number: ${row.invoicenumber} | Amount: ₹${row.totalamount} | Status: ${row.paymentstatus}`);
    });
    
    // Check if there are any unpaid
    const unpaid = await pool.query(
      "SELECT COUNT(*) as count FROM invoicemaster WHERE paymentstatus != 'Paid' AND paymentstatus IS NOT NULL"
    );
    console.log(`\nUnpaid invoices: ${unpaid.rows[0].count}`);
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
