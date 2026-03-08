const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

(async () => {
  try {
    console.log('\n=== CHECKING INVOICE PBM26MAR001 ===\n');
    
    const result = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, deletedat, branchid, customerid, totalamount, createdat 
       FROM invoicemaster 
       WHERE invoicenumber = $1`,
      ['PBM26MAR001']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Invoice PBM26MAR001 NOT FOUND in database');
    } else {
      console.log('✓ Invoice Found:');
      result.rows.forEach(row => {
        console.log('\nInvoice Details:');
        console.log('  Invoice ID:', row.invoiceid);
        console.log('  Invoice Number:', row.invoicenumber);
        console.log('  Payment Status:', row.paymentstatus || 'NULL');
        console.log('  Is Deleted:', row.deletedat ? 'YES ❌' : 'NO ✓');
        console.log('  Branch ID:', row.branchid);
        console.log('  Customer ID:', row.customerid);
        console.log('  Total Amount:', row.totalamount);
        console.log('  Created At:', row.createdat);
      });
    }
    
    // Also check payment details for this invoice
    if (result.rows.length > 0) {
      const invoiceId = result.rows[0].invoiceid;
      console.log('\n--- Checking Payment Details ---');
      const paymentResult = await pool.query(
        `SELECT paymentreceivedid, invoiceid, amount, paymentstatus, paymentdate, deletedat
         FROM paymentdetail 
         WHERE invoiceid = $1
         ORDER BY paymentdate DESC`,
        [invoiceId]
      );
      
      if (paymentResult.rows.length === 0) {
        console.log('No payment records found for this invoice');
      } else {
        console.log(`Found ${paymentResult.rows.length} payment record(s):`);
        paymentResult.rows.forEach((payment, idx) => {
          console.log(`\nPayment ${idx + 1}:`);
          console.log('  Amount:', payment.amount);
          console.log('  Status:', payment.paymentstatus);
          console.log('  Date:', payment.paymentdate);
          console.log('  Is Deleted:', payment.deletedat ? 'YES ❌' : 'NO ✓');
        });
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
