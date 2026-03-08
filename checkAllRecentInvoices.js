const pool = require('./backend/config/db');

async function checkAllInvoices() {
  try {
    const result = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, vehiclenumber, totalamount, createdat
       FROM invoicemaster 
       WHERE branchid = 2 AND deletedat IS NULL
       ORDER BY createdat DESC 
       LIMIT 15`
    );

    console.log('\n=== RECENT INVOICES IN BRANCH 2 (MURALI\'S BRANCH) ===\n');
    result.rows.forEach((inv, idx) => {
      console.log(`${idx + 1}. ${inv.invoicenumber}`);
      console.log(`   Status: ${inv.paymentstatus || '(NULL)'}`);
      console.log(`   Vehicle: ${inv.vehiclenumber}`);
      console.log(`   Amount: ${inv.totalamount}`);
      console.log(`   Created: ${inv.createdat}\n`);
    });

    // Check if any invoice created TODAY has NULL or non-standard status
    console.log('=== INVOICES CREATED TODAY WITH STATUS ISSUES ===\n');
    const todayResult = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, createdat
       FROM invoicemaster 
       WHERE branchid = 2 AND deletedat IS NULL
         AND createdat::date = CURRENT_DATE
         AND (paymentstatus IS NULL OR paymentstatus NOT IN ('Paid', 'Unpaid', 'Partial'))`
    );
    
    if (todayResult.rows.length > 0) {
      todayResult.rows.forEach(inv => {
        console.log(`${inv.invoicenumber}: Status = ${inv.paymentstatus || 'NULL'}`);
      });
    } else {
      console.log('None found');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAllInvoices();
