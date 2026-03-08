const pool = require('./backend/config/db');

async function testPaymentListQuery() {
  try {
    console.log('\n=== TESTING PAYMENT LIST QUERY ===\n');

    // Test query - simulating the updated payment controller
    const parenthesesQuery = `
      SELECT
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') AS customername,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat
      FROM invoicemaster im
      LEFT JOIN customermaster cm
        ON im.customerid = cm.customerid
        AND cm.deletedat IS NULL
      WHERE im.deletedat IS NULL
        AND im.branchid = $1
        AND COALESCE(im.paymentstatus, 'Unpaid') = $2
      ORDER BY im.createdat DESC
      LIMIT 10
    `;

    // Test 1: Looking for status = "Pending"
    console.log('Test 1: Query branch 2 invoices with status = "Pending"\n');
    let result = await pool.query(parenthesesQuery, [2, 'Pending']);
    console.log(`Found ${result.rows.length} invoices:`);
    result.rows.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. ${inv.invoicenumber} - Status: ${inv.paymentstatus}`);
    });

    // Test 2: Looking for status = "Unpaid"
    console.log('\nTest 2: Query branch 2 invoices with status = "Unpaid"\n');
    result = await pool.query(parenthesesQuery, [2, 'Unpaid']);
    console.log(`Found ${result.rows.length} invoices:`);
    result.rows.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. ${inv.invoicenumber} - Status: ${inv.paymentstatus}`);
    });

    // Test 3: Check INVPBM26FEB023 specifically
    console.log('\nTest 3: Check INVPBM26FEB023 with "Pending" filter\n');
    result = await pool.query(
      `SELECT invoicenumber, paymentstatus, COALESCE(paymentstatus, 'Unpaid') as coalesced_status
       FROM invoicemaster 
       WHERE invoicenumber = 'INVPBM26FEB023'`
    );
    if (result.rows.length > 0) {
      const inv = result.rows[0];
      console.log(`Invoice: ${inv.invoicenumber}`);
      console.log(`  Actual Status: ${inv.paymentstatus}`);
      console.log(`  COALESCE Result: ${inv.coalesced_status}`);
      console.log(`  Will match filter "Pending"? ${inv.coalesced_status === 'Pending' ? 'YES ✓' : 'NO ✗'}`);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testPaymentListQuery();
