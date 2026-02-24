const pool = require('./config/db');

async function checkInvoiceStatuses() {
  try {
    console.log('\n========================================');
    console.log('CHECKING ALL INVOICE STATUSES');
    console.log('========================================\n');

    // First, let's see all invoices and their statuses
    const allInvoices = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.paymentstatus,
        COALESCE(im.totalamount, 0) AS totalamount
      FROM invoicemaster im
      WHERE im.deletedat IS NULL
      ORDER BY im.invoiceid
    `);

    console.log('All Invoices:');
    allInvoices.rows.forEach(row => {
      console.log(`  Invoice ${row.invoiceid} - ${row.invoicenumber}: Status='${row.paymentstatus}' | Amount: ₹${row.totalamount}`);
    });

    // Count by status
    const statusCount = await pool.query(`
      SELECT 
        COALESCE(paymentstatus, 'NULL') as status,
        COUNT(*) as count
      FROM invoicemaster
      WHERE deletedat IS NULL
      GROUP BY paymentstatus
      ORDER BY status
    `);

    console.log('\nStatus Distribution:');
    statusCount.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} invoices`);
    });

    console.log('\n========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkInvoiceStatuses();
