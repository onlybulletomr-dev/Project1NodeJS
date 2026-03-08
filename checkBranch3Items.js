const pool = require('./backend/config/db');

async function check() {
  try {
    // Get all employees and their branches
    const employees = await pool.query(
      `SELECT employeeid, firstname, lastname, branchid FROM employeemaster WHERE deletedat IS NULL ORDER BY branchid, employeeid`
    );
    
    console.log('\n=== All Employees by Branch ===');
    let currentBranch = null;
    employees.rows.forEach(emp => {
      if (emp.branchid !== currentBranch) {
        currentBranch = emp.branchid;
        console.log(`\nBranch ${currentBranch}:`);
      }
      console.log(`  User ${emp.employeeid}: ${emp.firstname || ''} ${emp.lastname || ''}`);
    });

    // Check Branch 3 specifically
    const branch3Items = await pool.query(`
      SELECT id.itemid, im.partnumber, im.itemname, id.quantityonhand, id.deletedat
      FROM itemdetail id
      JOIN itemmaster im ON id.itemid = im.itemid
      WHERE id.branchid = 3
      ORDER BY im.partnumber
    `);
    console.log(`\n=== All Items in Branch 3 (${branch3Items.rows.length} total) ===`);
    branch3Items.rows.slice(0, 10).forEach(row => {
      const status = row.deletedat ? ' [DELETED]' : '';
      console.log(`${row.partnumber}: ${row.itemname} (Qty=${row.quantityonhand})${status}`);
    });

    // Find 888414 in branch 3
    const item888414 = branch3Items.rows.find(row => row.partnumber === '888414');
    if (item888414) {
      console.log('\n✓ FOUND 888414 in Branch 3:', item888414);
    } else {
      console.log('\n✗ Item 888414 NOT in Branch 3');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

check();
