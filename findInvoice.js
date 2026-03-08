const pool = require('./backend/config/db');

async function findInvoice() {
  try {
    console.log('\n=== SEARCHING FOR INVOICE VARIATIONS ===\n');

    // Search 1: Exact match
    let result = await pool.query(
      `SELECT * FROM invoicemaster WHERE invoicenumber = 'PBM26MAR001'`
    );
    console.log('Search 1: invoicenumber = "PBM26MAR001"');
    console.log(`  Found: ${result.rows.length}`);

    // Search 2: With INV prefix
    result = await pool.query(
      `SELECT * FROM invoicemaster WHERE invoicenumber = 'INVPBM26MAR001'`
    );
    console.log('\nSearch 2: invoicenumber = "INVPBM26MAR001"');
    console.log(`  Found: ${result.rows.length}`);

    // Search 3: Contains "MAR"
    result = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, createdat 
       FROM invoicemaster 
       WHERE invoicenumber ILIKE '%MAR%'
       ORDER BY createdat DESC`
    );
    console.log('\nSearch 3: invoicenumber contains "MAR"');
    console.log(`  Found: ${result.rows.length}`);
    if (result.rows.length > 0) {
      result.rows.slice(0, 10).forEach(inv => {
        console.log(`    ${inv.invoicenumber} - Status: ${inv.paymentstatus || 'NULL'} - ${inv.createdat}`);
      });
    }

    // Search 4: Check for vehicle number TN 14 C 4838
    result = await pool.query(
      `SELECT invoiceid, invoicenumber, vehiclenumber, paymentstatus, createdat 
       FROM invoicemaster 
       WHERE vehiclenumber LIKE '%14 C 4838%'
       ORDER BY createdat DESC`
    );
    console.log('\nSearch 4: vehiclenumber contains "14 C 4838"');
    console.log(`  Found: ${result.rows.length}`);
    if (result.rows.length > 0) {
      result.rows.forEach(inv => {
        console.log(`    ${inv.invoicenumber} - ${inv.vehiclenumber} - Status: ${inv.paymentstatus || 'NULL'}`);
      });
    }

    // Search 5: Get TOTAL count and latest 20 invoices
    result = await pool.query(
      `SELECT COUNT(*) as total FROM invoicemaster WHERE deletedat IS NULL`
    );
    console.log(`\nTotal invoices in DB: ${result.rows[0].total}`);

    result = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, createdat 
       FROM invoicemaster 
       WHERE deletedat IS NULL
       ORDER BY createdat DESC LIMIT 20`
    );
    console.log('\nLatest 20 invoices:');
    result.rows.forEach((inv, idx) => {
      const dateStr = new Date(inv.createdat).toLocaleDateString();
      console.log(`  ${idx + 1}. ${inv.invoicenumber} - Status: ${inv.paymentstatus || 'NULL'} - ${dateStr}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

findInvoice();
