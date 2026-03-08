const pool = require('./backend/config/db');

async function findPBM26MAR001() {
  try {
    console.log('\n=== SEARCHING FOR PBM26MAR001 ===\n');

    // Direct search
    let result = await pool.query(
      `SELECT invoiceid, invoicenumber, branchid, paymentstatus, vehiclenumber, totalamount, createdat
       FROM invoicemaster 
       WHERE invoicenumber = $1 AND deletedat IS NULL`,
      ['PBM26MAR001']
    );
    
    if (result.rows.length > 0) {
      const inv = result.rows[0];
      console.log('✓ FOUND INVOICE: PBM26MAR001');
      console.log(`  Invoice ID: ${inv.invoiceid}`);
      console.log(`  Branch ID: ${inv.branchid}`);
      console.log(`  Vehicle: ${inv.vehiclenumber}`);
      console.log(`  Amount: ${inv.totalamount}`);
      console.log(`  Payment Status: "${inv.paymentstatus}"`);
      console.log(`  Created: ${inv.createdat}`);
      
      console.log('\n=== DIAGNOSIS ===\n');
      
      if (inv.paymentstatus === null) {
        console.log('✗ PROBLEM: Payment Status is NULL');
        console.log('  The payment list filters for paymentstatus IN ("Paid", "Unpaid", "Partial")');
        console.log('  NULL values don\'t match any of these, so invoice won\'t appear in payment list');
        console.log('\n=== FIX ===');
        console.log('Need to update invoice to set paymentstatus to "Unpaid"');
      } else if (!['Paid', 'Unpaid', 'Partial', 'Pending'].includes(inv.paymentstatus)) {
        console.log(`✗ PROBLEM: Payment Status is "${inv.paymentstatus}"`);
        console.log('  Valid statuses for payment list are: "Paid", "Unpaid", "Partial"');
        console.log('  This status is not recognized');
      } else {
        console.log(`✓ Status is "${inv.paymentstatus}"`);
        console.log('  This should appear in the payment list');
      }

      // Test if it appears in payment list query
      console.log('\n=== TESTING PAYMENT LIST QUERY ===\n');
      
      const status = inv.paymentstatus || 'Unpaid';
      const testResult = await pool.query(
        `SELECT invoicenumber, paymentstatus FROM invoicemaster 
         WHERE invoicenumber = $1 
         AND COALESCE(paymentstatus, 'Unpaid') = $2`,
        ['PBM26MAR001', status]
      );
      
      if (testResult.rows.length > 0) {
        console.log(`✓ Invoice WOULD appear in payment list for status "${status}"`);
      } else {
        console.log(`✗ Invoice would NOT appear in payment list`);
        console.log('  This means the payment list query has different filters or the status doesn\'t match');
      }

    } else {
      console.log('✗ NOT FOUND: Invoice PBM26MAR001');
      console.log('  This invoice does not exist in the database');
      
      // Show what WAS found recently in that branch
      console.log('\n=== RECENT INVOICES (for comparison) ===\n');
      const recentResult = await pool.query(
        `SELECT invoicenumber, paymentstatus, createdat
         FROM invoicemaster 
         WHERE branchid = 2 AND deletedat IS NULL
         ORDER BY createdat DESC LIMIT 5`
      );
      recentResult.rows.forEach((inv, idx) => {
        console.log(`${idx + 1}. ${inv.invoicenumber} - Status: ${inv.paymentstatus || 'NULL'}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

findPBM26MAR001();
