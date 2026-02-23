const pool = require('./config/db');

(async () => {
  try {
    // Check schema
    const schema = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'invoicemaster' AND column_name = 'vehiclenumber'
    `);
    console.log('vehiclenumber column:', schema.rows);
    
    // Check existing data
    const data = await pool.query(`
      SELECT invoiceid, invoicenumber, vehiclenumber, customerid FROM invoicemaster 
      WHERE deletedat IS NULL ORDER BY invoiceid DESC LIMIT 5
    `);
    console.log('\nExisting invoices:', data.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
