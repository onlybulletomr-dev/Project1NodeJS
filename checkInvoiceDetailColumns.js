const pool = require('./backend/config/db');

(async () => {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'invoicedetail' 
       ORDER BY ordinal_position`
    );
    console.log('InvoiceDetail columns:');
    result.rows.forEach(row => {
      console.log('  -', row.column_name);
    });
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
