const db = require('./config/db');

async function checkInvoice63() {
  try {
    console.log('Checking invoice 63 in database...');
    
    const query = `
      SELECT invoiceid, invoicenumber, customerid, vehiclenumber, invoicedate
      FROM invoicemaster
      WHERE invoiceid = 63 AND deletedat IS NULL
    `;
    
    const result = await db.query(query);
    
    console.log('\n=== DIRECT DATABASE QUERY RESULT ===');
    console.log('Number of rows found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\nInvoice 63 details:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      // Check if invoicenumber is null
      const invoice = result.rows[0];
      console.log('\nField Analysis:');
      console.log('- invoiceid:', invoice.invoiceid, '(type:', typeof invoice.invoiceid, ')');
      console.log('- invoicenumber:', invoice.invoicenumber, '(type:', typeof invoice.invoicenumber, ')');
      console.log('- invoicenumber is null?', invoice.invoicenumber === null);
      console.log('- invoicenumber is undefined?', invoice.invoicenumber === undefined);
      console.log('- invoicenumber length:', invoice.invoicenumber?.length);
    } else {
      console.log('\n⚠️ Invoice ID 63 NOT FOUND or is deleted');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking invoice 63:', error);
    process.exit(1);
  }
}

checkInvoice63();
