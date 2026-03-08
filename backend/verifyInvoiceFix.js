const pool = require('./config/db');

(async () => {
  try {
    const bad = await pool.query('SELECT COUNT(*) as count FROM invoicemaster WHERE vehicleid = 1');
    const results = await pool.query(`
      SELECT invoicenumber, vehicleid FROM invoicemaster 
      WHERE invoicenumber IN ('OMR26MAR001', 'INVOMR26FEB001', 'INVPBM26FEB023')
    `);
    
    console.log('Remaining invoices with vehicleid=1:', bad.rows[0].count);
    console.log('\nTest invoices after fix:');
    results.rows.forEach(r => console.log(`  ${r.invoicenumber}: vehicleid=${r.vehicleid}`));
    
    process.exit(0);
  } catch(err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
