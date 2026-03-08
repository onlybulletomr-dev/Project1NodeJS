const pool = require('./backend/config/db');

async function findTodayInvoice() {
  try {
    console.log('\n=== INVOICES CREATED TODAY (MARCH 7, 2026) IN BRANCH 2 ===\n');

    // Get invoices created today in Branch 2
    const result = await pool.query(
      `SELECT 
         invoiceid,
         invoicenumber,
         customerid,
         vehiclenumber,
         totalamount,
         paymentstatus,
         createdby,
         createdat,
         deletedat
       FROM invoicemaster 
       WHERE branchid = 2 
         AND deletedat IS NULL
         AND createdat::date = CURRENT_DATE
       ORDER BY createdat DESC`
    );

    if (result.rows.length === 0) {
      console.log('✗ No invoices found created today in Branch 2');
      
      // Show recent invoices for comparison
      console.log('\n=== RECENT INVOICES IN BRANCH 2 ===\n');
      const recent = await pool.query(
        `SELECT invoicenumber, createdat, paymentstatus
         FROM invoicemaster 
         WHERE branchid = 2 AND deletedat IS NULL
         ORDER BY createdat DESC LIMIT 10`
      );
      recent.rows.forEach((inv, idx) => {
        console.log(`${idx + 1}. ${inv.invoicenumber} - ${new Date(inv.createdat).toLocaleString()} - Status: ${inv.paymentstatus || 'NULL'}`);
      });
    } else {
      console.log(`✓ FOUND ${result.rows.length} INVOICE(S) CREATED TODAY IN BRANCH 2\n`);
      
      result.rows.forEach((inv, idx) => {
        console.log(`${idx + 1}. INVOICE NUMBER: ${inv.invoicenumber}`);
        console.log(`   Invoice ID: ${inv.invoiceid}`);
        console.log(`   Vehicle Number: ${inv.vehiclenumber}`);
        console.log(`   Total Amount: ${inv.totalamount}`);
        console.log(`   Payment Status: ${inv.paymentstatus || '(NULL)'}`);
        console.log(`   Created By (User ID): ${inv.createdby}`);
        console.log(`   Created At: ${new Date(inv.createdat).toLocaleString()}`);
        console.log(`   Deleted: ${inv.deletedat || '(Active)'}\n`);

        // Get invoice details
        (async () => {
          const detailResult = await pool.query(
            `SELECT itemid, qty, unitprice, linetotal FROM invoicedetail WHERE invoiceid = $1 AND deletedat IS NULL`,
            [inv.invoiceid]
          );
          console.log(`   Invoice Details (${detailResult.rows.length} items):`);
          detailResult.rows.forEach((detail, didx) => {
            console.log(`     ${didx + 1}. Item ID: ${detail.itemid}, Qty: ${detail.qty}, Unit Price: ${detail.unitprice}, Total: ${detail.linetotal}`);
          });
          console.log('');
        })();
      });

      // Check payment status issue
      const inv = result.rows[0];
      console.log('\n=== PAYMENT LIST CHECK ===\n');
      if (inv.paymentstatus === null) {
        console.log('✗ ISSUE FOUND: Payment Status is NULL');
        console.log('  Payment list only shows: Paid, Unpaid, Partial');
        console.log('  Invoice with NULL status won\'t appear in payment list');
        console.log('\n  SOLUTION: Update status to "Unpaid"');
      } else if (!['Paid', 'Unpaid', 'Partial'].includes(inv.paymentstatus)) {
        console.log(`⚠️  Payment Status is "${inv.paymentstatus}"`);
        console.log('  Valid statuses for payment list are: Paid, Unpaid, Partial');
        console.log(`\n  SOLUTION: Update status to "Unpaid" (or change payment list to accept "${inv.paymentstatus}")`);
      } else {
        console.log(`✓ Payment Status is "${inv.paymentstatus}" - Should appear in payment list`);
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

findTodayInvoice();
