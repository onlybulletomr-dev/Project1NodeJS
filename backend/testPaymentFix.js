const pool = require('./config/db');

async function testPaymentQuery() {
  try {
    // Test the corrected query that filters by invoice branch
    const userId = 7; // Jagatheish - Branch 3
    
    // Get user's branch
    const userResult = await pool.query(
      'SELECT branchid FROM employeemaster WHERE employeeid = $1 AND deletedat IS NULL',
      [userId]
    );
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;
    console.log('✓ User Branch:', userBranchID);

    // Test the new query with im.branchid filter
    const query = `
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.branchid,
        COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '') as customername,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      LEFT JOIN paymentdetail pd ON im.invoiceid = pd.invoiceid AND pd.deletedat IS NULL
      WHERE im.deletedat IS NULL 
        AND COALESCE(im.paymentstatus, 'Unpaid') IN ('Unpaid', 'Partial')
        AND im.branchid = $1
      GROUP BY im.invoiceid, im.invoicenumber, im.branchid, cm.firstname, cm.lastname, im.totalamount, im.paymentstatus
      ORDER BY im.createdat DESC
    `;

    const result = await pool.query(query, [userBranchID]);
    console.log('\n✓ Unpaid Invoices Retrieved:', result.rows.length);
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. Invoice #${row.invoicenumber} | Customer: ${row.customername} | Amount: ${row.totalamount} | Status: ${row.paymentstatus}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testPaymentQuery();
