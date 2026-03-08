const pool = require('./backend/config/db');

async function checkBranches() {
  try {
    console.log('\n=== COMPANY/BRANCH STRUCTURE ===\n');

    const result = await pool.query(
      `SELECT CompanyID, CompanyName, ExtraVar1 as BranchCode
       FROM CompanyMaster
       WHERE DeletedAt IS NULL
       ORDER BY CompanyID`
    );

    result.rows.forEach(branch => {
      console.log(`Company ID ${branch.companyid}: ${branch.companyname}`);
      console.log(`  Branch Code (ExtraVar1): ${branch.branchcode}`);
    });

    console.log('\n=== MURALI\'S BRANCH ===\n');
    const muraliResult = await pool.query(
      `SELECT e.employeeid, e.firstname, e.branchid, c.CompanyName, c.ExtraVar1 as BranchCode
       FROM employeemaster e
       LEFT JOIN CompanyMaster c ON e.branchid = c.CompanyID
       WHERE e.firstname ILIKE '%murali%' AND e.deletedat IS NULL`
    );

    muraliResult.rows.forEach(emp => {
      console.log(`Employee: ${emp.firstname}`);
      console.log(`  Employee ID: ${emp.employeeid}`);
      console.log(`  Branch ID: ${emp.branchid}`);
      console.log(`  Branch Name: ${emp.companyname}`);
      console.log(`  Branch Code: ${emp.branchcode || '(not set)'}`);
    });

    // Check all invoices for Murali's branch
    console.log('\n=== INVOICES FOR MURALI\'S BRANCH (ID: 2) ===\n');
    const invoiceResult = await pool.query(
      `SELECT invoiceid, invoicenumber, paymentstatus, createdat
       FROM invoicemaster
       WHERE branchid = 2 AND deletedat IS NULL
       ORDER BY createdat DESC LIMIT 10`
    );
    
    invoiceResult.rows.forEach(inv => {
      const status = inv.paymentstatus || 'NULL';
      console.log(`${inv.invoicenumber} - Status: ${status}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkBranches();
