const pool = require('./backend/config/db');

async function testPendingInvoiceAPI() {
  try {
    console.log('=== TEST PENDING INVOICE API ===\n');

    // 1. Check what invoices exist with Pending status
    const checkPending = `
      SELECT 
        invoiceid,
        invoicenumber,
        paymentstatus,
        totalamount,
        branchid
      FROM invoicemaster
      WHERE deletedat IS NULL AND paymentstatus = 'Pending'
      ORDER BY createdat DESC
    `;
    console.log('1. Checking invoices with status = "Pending"...');
    const pendingResult = await pool.query(checkPending);
    console.log(`Found ${pendingResult.rows.length} invoices with Pending status`);
    pendingResult.rows.forEach(row => {
      console.log(`  - ${row.invoicenumber}: status=${row.paymentstatus}, amount=${row.totalamount}, branchid=${row.branchid}`);
    });

    // 2. Simulate the query that getInvoicesByStatus uses
    const userBranchID = 2; // PBM branch (Murali)
    const normalizedStatus = 'Pending';

    console.log('\n2. Simulating getInvoicesByStatus query for Branch 2 with Pending status...');
    const query = `
      SELECT
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') AS customername,
        cm.mobilenumber1 AS phonenumber,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat,
        im.paymentdate AS invoicepaymentdate,
        im.customerid,
        im.vehicleid,
        COALESCE(totals.amountpaid, 0) AS amountpaid,
        COALESCE(im.totalamount, 0) - COALESCE(totals.amountpaid, 0) AS amounttobepaid,
        pd.paymentreceivedid,
        pd.paymentdate,
        COALESCE(pd.amount, 0) AS paymentamount,
        pm.methodname AS paymentmode
      FROM invoicemaster im
      LEFT JOIN customermaster cm
        ON im.customerid = cm.customerid
        AND cm.deletedat IS NULL
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CASE WHEN p2.paymentstatus IN ('Paid', 'Completed') THEN p2.amount ELSE 0 END), 0) AS amountpaid
        FROM paymentdetail p2
        WHERE p2.invoiceid = im.invoiceid
          AND p2.deletedat IS NULL
      ) totals ON TRUE
      LEFT JOIN paymentdetail pd
        ON pd.invoiceid = im.invoiceid
        AND pd.deletedat IS NULL
        AND pd.paymentstatus IN ('Paid', 'Completed')
      LEFT JOIN paymentmethodmaster pm
        ON pm.paymentmethodid = pd.paymentmethodid
        AND pm.deletedat IS NULL
      WHERE im.deletedat IS NULL
        AND im.branchid = $1
        AND COALESCE(im.paymentstatus, 'Unpaid') = $2
      ORDER BY im.createdat DESC, pd.paymentdate DESC NULLS LAST, pd.paymentreceivedid DESC NULLS LAST
    `;

    const result = await pool.query(query, [userBranchID, normalizedStatus]);
    console.log(`Query returned ${result.rows.length} rows`);
    result.rows.forEach(row => {
      console.log(`  Invoice: ${row.invoicenumber}`);
      console.log(`    - Total Amount: ${row.totalamount}`);
      console.log(`    - Amount Paid: ${row.amountpaid}`);
      console.log(`    - Amount To Be Paid: ${row.amounttobepaid}`);
      console.log(`    - Payment Status: ${row.paymentstatus}`);
      console.log(`    - Payment Method: ${row.paymentmode || '(no payment)'}`);
    });

    // 3. Check if there are any payment records for the pending invoice
    if (pendingResult.rows.length > 0) {
      const pendingInvoiceId = pendingResult.rows[0].invoiceid;
      console.log(`\n3. Checking payment records for invoice ID ${pendingInvoiceId}...`);
      
      const paymentCheck = `
        SELECT 
          paymentreceivedid,
          invoiceid,
          paymentstatus,
          amount,
          paymentdate,
          deletedat
        FROM paymentdetail
        WHERE invoiceid = $1
      `;
      const paymentResult = await pool.query(paymentCheck, [pendingInvoiceId]);
      console.log(`Found ${paymentResult.rows.length} payment records`);
      paymentResult.rows.forEach(row => {
        console.log(`  - Payment ID: ${row.paymentreceivedid}, Status: ${row.paymentstatus}, Amount: ${row.amount}, Deleted: ${row.deletedat}`);
      });
    }

    console.log('\n=== END TEST ===');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPendingInvoiceAPI();
