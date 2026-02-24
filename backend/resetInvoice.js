const pool = require('./config/db');

async function resetInvoice() {
  try {
    // Set invoice 34 back to Unpaid for testing
    const result = await pool.query(
      'UPDATE invoicemaster SET paymentstatus = $1 WHERE invoiceid = $2 RETURNING invoiceid, invoicenumber, paymentstatus',
      ['Unpaid', 34]
    );
    
    if (result.rows.length > 0) {
      console.log(`✓ Invoice ${result.rows[0].invoiceid} (${result.rows[0].invoicenumber}) set to: ${result.rows[0].paymentstatus}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetInvoice();
