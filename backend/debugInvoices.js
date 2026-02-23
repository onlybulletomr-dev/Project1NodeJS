const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== Checking Invoice Data ===');
    
    // Check invoices
    const invoices = await pool.query(`
      SELECT invoiceid, invoicenumber, branchid, customerid, vehiclenumber 
      FROM invoicemaster 
      WHERE deletedat IS NULL 
      LIMIT 5
    `);
    console.log('Invoices:', invoices.rows);
    
    // Check customers
    if (invoices.rows.length > 0) {
      const customerIds = invoices.rows.map(i => i.customerid);
      console.log('\nLooking for customers with IDs:', customerIds);
      
      const customers = await pool.query(`
        SELECT customerid, firstname, lastname 
        FROM customermaster 
        WHERE customerid = ANY($1)
      `, [customerIds]);
      console.log('Customers found:', customers.rows);
    }
    
    // Test the JOIN query
    console.log('\n=== Testing Full JOIN Query ===');
    const result = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.customerid,
        im.vehiclenumber,
        im.branchid,
        cm.firstname,
        cm.lastname,
        COALESCE(cm.firstname || ' ' || cm.lastname, 'N/A') as customername
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      WHERE im.branchid IN (1,2) AND im.deletedat IS NULL
      LIMIT 5
    `);
    
    console.log('Full query results:', JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
