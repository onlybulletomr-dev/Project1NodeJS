const pool = require('./config/db');

(async () => {
  try {
    const result = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.customerid,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') as customername
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      WHERE im.branchid IN (1,2) AND im.deletedat IS NULL
      LIMIT 5
    `);
    console.log('Fixed query results:', JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
