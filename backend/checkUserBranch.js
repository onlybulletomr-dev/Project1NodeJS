const pool = require('./config/db');

(async () => {
  try {
    console.log('\n=== USER AND BRANCH INFORMATION ===\n');
    
    // Check employees and their branches
    const empRes = await pool.query(
      'SELECT employeeid, firstname, lastname, branchid FROM employeemaster WHERE deletedat IS NULL ORDER BY employeeid'
    );
    
    console.log('Employees and their branches:');
    empRes.rows.forEach(emp => {
      console.log(`  ID: ${emp.employeeid} | Name: ${emp.firstname} ${emp.lastname} | Branch: ${emp.branchid}`);
    });
    
    // Check company/branch codes
    console.log('\n--- Company/Branch Codes ---');
    const compRes = await pool.query(
      'SELECT companyid, companyname, extravar1 FROM companymaster WHERE deletedat IS NULL ORDER BY companyid'
    );
    
    compRes.rows.forEach(comp => {
      console.log(`  Branch ${comp.companyid}: ${comp.companyname} | Code: ${comp.extravar1}`);
    });
    
    // Check the most recent save attempt
    console.log('\n--- Most Recent Invoice Create Attempt ---');
    const invRes = await pool.query(
      'SELECT invoiceid, invoicenumber, branchid, createdat FROM invoicemaster ORDER BY createdat DESC LIMIT 1'
    );
    
    if (invRes.rows.length > 0) {
      const inv = invRes.rows[0];
      console.log(`Last invoice: ${inv.invoicenumber} | Branch: ${inv.branchid} | Created: ${inv.createdat}`);
    } else {
      console.log('No invoices found');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
