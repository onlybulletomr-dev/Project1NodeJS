const pool = require('./config/db');

async function checkInvoices() {
  try {
    const result = await pool.query('SELECT invoiceid, invoicenumber, totalamount, paymentstatus FROM invoicemaster WHERE deletedat IS NULL LIMIT 10');
    console.log('Available invoices:');
    result.rows.forEach(row => {
      console.log(`  Invoice ${row.invoiceid}: ${row.invoicenumber} | Amount: ₹${row.totalamount} | Status: ${row.paymentstatus}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkInvoices();
