const pool = require('./backend/config/db');

async function checkInvoiceStatus() {
  try {
    const result = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, vehiclenumber, totalamount, createdat
       FROM invoicemaster 
       WHERE invoicenumber = 'PBM26MAR001'`
    );

    console.log('\n=== INVOICE PBM26MAR001 STATUS ===\n');
    if (result.rows.length > 0) {
      const inv = result.rows[0];
      console.log('Invoice Number:', inv.invoicenumber);
      console.log('Invoice ID:', inv.invoiceid);
      console.log('Vehicle:', inv.vehiclenumber);
      console.log('Total Amount:', inv.totalamount);
      console.log('Payment Status:', inv.paymentstatus);
      console.log('Status is NULL?:', inv.paymentstatus === null);
      console.log('Created:', inv.createdat);

      console.log('\n=== DIAGNOSIS ===');
      if (inv.paymentstatus === null) {
        console.log('✗ Payment Status is NULL - should be "Unpaid"');
        console.log('The payment list query filters for paymentstatus = "Unpaid"');
        console.log('So it won\'t show invoices with NULL status');
      } else if (inv.paymentstatus !== 'Unpaid') {
        console.log(`✗ Payment Status is "${inv.paymentstatus}" - not "Unpaid"`);
        console.log('The payment list only shows Unpaid, Paid, or Partial');
      } else {
        console.log('✓ Status is correct ("Unpaid")');
        console.log('Invoice should appear in payment list');
      }
    } else {
      console.log('Invoice not found');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkInvoiceStatus();
