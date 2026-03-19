const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db'
});

async function checkInvoiceDetails() {
  try {
    // Get recent invoices
    const invoices = await pool.query(
      `SELECT invoiceid, invoicenumber, createdat 
       FROM invoicemaster 
       WHERE deletedat IS NULL 
       ORDER BY invoiceid DESC 
       LIMIT 5`
    );
    
    console.log('Recent invoices:');
    console.log(JSON.stringify(invoices.rows, null, 2));

    // Get details for each recent invoice
    for (const invoice of invoices.rows) {
      console.log(`\n--- Invoice ${invoice.invoiceid} (${invoice.invoicenumber}) ---`);
      const details = await pool.query(
        `SELECT invoicedetailid, itemid, qty, unitprice, partnumber, itemname 
         FROM invoicedetail 
         WHERE invoiceid = $1 
         ORDER BY invoicedetailid`,
        [invoice.invoiceid]
      );
      console.log(JSON.stringify(details.rows, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoiceDetails();
