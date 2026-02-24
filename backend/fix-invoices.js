const pool = require('./config/db');

async function fixInvoices() {
  try {
    const result = await pool.query(
      `UPDATE invoicemaster 
       SET vehicleid = 4, vehiclenumber = 'TN 45 AY 0676', updatedby = 1, updatedat = CURRENT_DATE
       WHERE invoiceid IN (32, 33)`
    );
    
    console.log(`Updated ${result.rowCount} invoices with valid vehicle information`);
    
    // Verify the update
    const verify = await pool.query(
      `SELECT invoiceid, invoicenumber, vehicleid, vehiclenumber FROM invoicemaster WHERE invoiceid IN (32, 33)`
    );
    
    console.log('Updated invoices:');
    console.table(verify.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixInvoices();
