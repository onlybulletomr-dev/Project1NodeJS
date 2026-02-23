const pool = require('../config/db');

async function populatePaymentData() {
  try {
    console.log('Populating payment data for existing invoices...');

    // Try to update TotalAmount from InvoiceDetail totals (if table exists and has data)
    try {
      const updateTotalAmountQuery = `
        UPDATE InvoiceMaster im
        SET TotalAmount = COALESCE((
          SELECT SUM(total) FROM InvoiceDetail WHERE invoiceid = im.InvoiceID
        ), 0)
        WHERE (TotalAmount IS NULL OR TotalAmount = 0)
      `;
      const result1 = await pool.query(updateTotalAmountQuery);
      console.log(`✓ Updated TotalAmount for ${result1.rowCount} invoices from InvoiceDetail`);
    } catch (e) {
      console.log(`⚠ Could not calculate TotalAmount from InvoiceDetail: ${e.message}`);
      console.log('  (This is OK - you may need to manually set amounts)');
    }

    // Set PaymentStatus to 'Unpaid' for all invoices without a status
    const updatePaymentStatusQuery = `
      UPDATE InvoiceMaster
      SET PaymentStatus = 'Unpaid'
      WHERE PaymentStatus IS NULL OR PaymentStatus = ''
    `;
    const result2 = await pool.query(updatePaymentStatusQuery);
    console.log(`✓ Set PaymentStatus to 'Unpaid' for ${result2.rowCount} invoices`);

    // Fetch all invoices to check
    const fetchQuery = `
      SELECT invoiceid, invoicenumber, totalamount, paymentstatus, createdat
      FROM InvoiceMaster
      WHERE DeletedAt IS NULL
      ORDER BY createdat DESC
    `;
    const result3 = await pool.query(fetchQuery);
    console.log(`\n✓ Total invoices in system: ${result3.rowCount}`);
    console.log('\nInvoice Details:');
    result3.rows.forEach((invoice, index) => {
      console.log(`  ${index + 1}. Invoice #${invoice.invoicenumber || 'N/A'} - ${invoice.paymentstatus} - Amount: ${invoice.totalamount || 0}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ Error populating payment data:', error.message);
    process.exit(1);
  }
}

populatePaymentData();
