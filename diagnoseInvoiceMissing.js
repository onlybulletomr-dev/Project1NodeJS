const pool = require('./backend/config/db');

async function diagnoseInvoice() {
  try {
    console.log('\n=== DIAGNOSING INVOICE: PBM26MAR001 ===\n');

    // 1. Check if invoice exists in invoicemaster
    const invoiceCheck = await pool.query(
      `SELECT im.invoiceid, im.invoicenumber, im.vehiclenumber, im.createdat, im.createdby, im.branchid, im.paymentstatus, 
              COALESCE(cm.firstname || ' ' || cm.lastname, 'N/A') as customer_name
       FROM invoicemaster im
       LEFT JOIN customermaster cm ON im.customerid = cm.customerid
       WHERE im.invoicenumber = $1`,
      ['PBM26MAR001']
    );

    console.log('1. INVOICE EXISTS IN DB?');
    if (invoiceCheck.rows.length > 0) {
      const inv = invoiceCheck.rows[0];
      console.log('✓ YES - Found invoice:');
      console.log(`   Invoice ID: ${inv.invoiceid}`);
      console.log(`   Invoice #: ${inv.invoicenumber}`);
      console.log(`   Vehicle: ${inv.vehiclenumber}`);
      console.log(`   Customer: ${inv.customer_name}`);
      console.log(`   Branch ID: ${inv.branchid}`);
      console.log(`   Status: ${inv.paymentstatus}`);
      console.log(`   Created: ${inv.createdat}`);
      console.log(`   Created By (User ID): ${inv.createdby}`);
    } else {
      console.log('✗ NO - Invoice not found in database!');
      console.log('   This means the invoice was NOT successfully saved.');
    }

    // 2. Check if there are associated invoice details/items
    if (invoiceCheck.rows.length > 0) {
      const invId = invoiceCheck.rows[0].invoiceid;
      const detailsCheck = await pool.query(
        `SELECT COUNT(*) as item_count FROM invoicedetail WHERE invoiceid = $1 AND deletedat IS NULL`,
        [invId]
      );
      console.log('\n2. INVOICE ITEMS:');
      console.log(`   Items in invoice: ${detailsCheck.rows[0].item_count}`);
    }

    // 3. Check user (Murali) and their branch
    const muraliCheck = await pool.query(
      `SELECT employeeid, firstname, branchid FROM employeemaster 
       WHERE firstname ILIKE '%murali%' AND deletedat IS NULL`
    );
    console.log('\n3. MURALI\'S ACCOUNT:');
    if (muraliCheck.rows.length > 0) {
      muraliCheck.rows.forEach(emp => {
        console.log(`   User ID: ${emp.employeeid}`);
        console.log(`   Name: ${emp.firstname}`);
        console.log(`   Branch: ${emp.branchid}`);
      });
    } else {
      console.log('   No user named Murali found');
    }

    // 4. Test the actual invoice list query
    console.log('\n4. INVOICE LIST QUERY TEST (simulating Murali/User 1 in Branch 2):');
    const listQuery = await pool.query(
      `SELECT im.invoiceid, im.invoicenumber, im.vehiclenumber, im.paymentstatus, im.createdat
       FROM invoicemaster im
       WHERE im.branchid = 2 AND im.deletedat IS NULL 
       ORDER BY im.createdat DESC LIMIT 50`
    );
    console.log(`   Found ${listQuery.rows.length} invoices in Branch 2`);
    if (listQuery.rows.length > 0) {
      console.log('   Recent invoices:');
      listQuery.rows.slice(0, 5).forEach((inv, idx) => {
        console.log(`     ${idx + 1}. ${inv.invoicenumber} - ${inv.vehiclenumber}`);
      });
      
      // Check if PBM26MAR001 is in the list
      const found = listQuery.rows.find(inv => inv.invoicenumber === 'PBM26MAR001');
      if (found) {
        console.log(`     ✓ PBM26MAR001 IS in the list!`);
      } else {
        console.log(`     ✗ PBM26MAR001 NOT in the Branch 2 list`);
      }
    }

    // 5. Check if invoice is in a different branch
    const otherBranches = await pool.query(
      `SELECT im.invoiceid, im.invoicenumber, im.branchid, im.vehiclenumber
       FROM invoicemaster im
       WHERE im.invoicenumber = 'PBM26MAR001'`
    );
    if (otherBranches.rows.length > 0) {
      console.log('\n5. INVOICE IN DIFFERENT BRANCH?');
      otherBranches.rows.forEach(inv => {
        console.log(`   ✗ Found in Branch ${inv.branchid} (Murali is in Branch 2)`);
      });
    }

    // 6. Check payment records
    const paymentCheck = await pool.query(
      `SELECT pd.paymentid, pd.invoiceid, pd.amount, pd.paymentstatus, pd.createdat
       FROM paymentdetail pd
       JOIN invoicemaster im ON pd.invoiceid = im.invoiceid
       WHERE im.invoicenumber = $1`,
      ['PBM26MAR001']
    );
    console.log('\n6. PAYMENT RECORDS:');
    if (paymentCheck.rows.length > 0) {
      console.log(`   Found ${paymentCheck.rows.length} payment(s)`);
      paymentCheck.rows.forEach(pmt => {
        console.log(`   - Payment ID ${pmt.paymentid}: $${pmt.amount} (${pmt.paymentstatus})`);
      });
    } else {
      console.log(`   No payments recorded for this invoice`);
    }

    await pool.end();
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    await pool.end();
    process.exit(1);
  }
}

diagnoseInvoice();
