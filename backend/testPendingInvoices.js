const pool = require('./config/db');

async function testPendingInvoices() {
  try {
    console.log('\n========================================');
    console.log('TESTING PENDING INVOICES QUERY');
    console.log('========================================\n');

    // Test the updated query - Unpaid and Partially Paid invoices
    const result = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.paymentstatus,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') as customername
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      WHERE COALESCE(im.paymentstatus, 'Unpaid') IN ('Unpaid', 'Partial')
      AND im.deletedat IS NULL
      ORDER BY im.invoiceid
    `);

    console.log('Unpaid & Partially Paid Invoices:');
    if (result.rows.length === 0) {
      console.log('  No invoices found\n');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`  ${i+1}. Invoice ${row.invoiceid} - ${row.invoicenumber}`);
        console.log(`     Status: ${row.paymentstatus} | Amount: ₹${row.totalamount} | Customer: ${row.customername}`);
      });
    }
    console.log(`\nTotal: ${result.rows.length} invoices\n`);

    // Also show breakdown by status
    const statusResult = await pool.query(`
      SELECT 
        paymentstatus,
        COUNT(*) as count,
        COALESCE(SUM(totalamount), 0) as total_amount
      FROM invoicemaster
      WHERE paymentstatus IN ('Unpaid', 'Partial') AND deletedat IS NULL
      GROUP BY paymentstatus
      ORDER BY paymentstatus
    `);

    console.log('Breakdown by Status:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.paymentstatus}: ${row.count} invoices | Total: ₹${row.total_amount}`);
    });

    console.log('\n========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testPendingInvoices();
