const pool = require('./config/db');

(async () => {
  try {
    const InvoiceID = 62;
    
    // Test invoice query
    const invoiceQuery = `
      SELECT 
        invoiceid,
        invoicenumber,
        vehiclenumber,
        totalamount,
        paymentstatus,
        createdat,
        COALESCE(paymentdate, createdat) as paymentdate
      FROM invoicemaster
      WHERE invoiceid = $1 AND deletedat IS NULL
    `;
    const invoiceResult = await pool.query(invoiceQuery, [InvoiceID]);
    
    console.log('Invoice query result:', invoiceResult.rows[0]);
    
    if (invoiceResult.rows.length === 0) {
      console.log('Invoice not found');
      process.exit(0);
    }
    
    // Test payment query
    const paymentQuery = `
      SELECT 
        pd.paymentreceivedid,
        pd.invoiceid,
        pd.paymentdate,
        pd.amount,
        pd.paymentstatus,
        pd.transactionreference,
        pd.notes,
        pm.methodname as paymentmethod,
        pd.createdby,
        pd.createdat
      FROM paymentdetail pd
      LEFT JOIN paymentmethodmaster pm ON pd.paymentmethodid = pm.paymentmethodid
      WHERE pd.invoiceid = $1 AND pd.deletedat IS NULL
      ORDER BY pd.createdat DESC
    `;
    const paymentResult = await pool.query(paymentQuery, [InvoiceID]);
    
    console.log('Payment query result:');
    console.log(paymentResult.rows);
    
    process.exit(0);
  } catch(err) {
    console.error('Query Error:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  }
})();
