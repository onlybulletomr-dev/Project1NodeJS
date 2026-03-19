const pool = require('./backend/config/db');

// Check what fields exist for employee 15 vs other employees
async function compareEmployees() {
  try {
    console.log('[CHECK] Comparing Employee 15 with other employees...\n');

    // Get employee 15
    const emp15 = await pool.query(
      'SELECT * FROM employeemaster WHERE employeeid = 15;'
    );

    // Get another employee for comparison
    const emp1 = await pool.query(
      'SELECT * FROM employeemaster WHERE employeeid = 1;'
    );

    console.log('=== EMPLOYEE 15 ===');
    if (emp15.rows.length > 0) {
      const e15 = emp15.rows[0];
      console.log(`ID: ${e15.employeeid}`);
      console.log(`Name: ${e15.firstname} ${e15.lastname}`);
      console.log(`Role (boolean): ${e15.role}`);
      console.log(`Role Type: ${e15.role_type}`);
      console.log(`Branch: ${e15.branchid}`);
      console.log(`Is Active: ${e15.isactive}`);
      console.log(`Deleted At: ${e15.deletedat}`);
      console.log(`Full record keys: ${Object.keys(e15).join(', ')}`);
    } else {
      console.log('❌ Employee 15 NOT FOUND');
    }

    console.log('\n=== EMPLOYEE 1 (Reference) ===');
    if (emp1.rows.length > 0) {
      const e1 = emp1.rows[0];
      console.log(`ID: ${e1.employeeid}`);
      console.log(`Name: ${e1.firstname} ${e1.lastname}`);
      console.log(`Role (boolean): ${e1.role}`);
      console.log(`Role Type: ${e1.role_type}`);
      console.log(`Branch: ${e1.branchid}`);
      console.log(`Is Active: ${e1.isactive}`);
      console.log(`Deleted At: ${e1.deletedat}`);
    }

    console.log('\n=== CHECK: Would Employee 15 appear in role management query? ===');
    const roleQuery = await pool.query(`
      SELECT 
        e.employeeid,
        e.firstname,
        e.lastname,
        e.role,
        e.employeetype,
        e.branchid,
        c.companyname as branchname,
        e.isactive,
        e.dateofjoining
      FROM employeemaster e
      LEFT JOIN companymaster c ON e.branchid = c.companyid
      WHERE e.deletedat IS NULL AND (e.employeeid = 15 OR e.employeeid = 1)
      ORDER BY e.firstname, e.lastname
    `);

    console.log(`Results: ${roleQuery.rows.length} employees`);
    roleQuery.rows.forEach(row => {
      console.log(`- ${row.firstname} ${row.lastname} (ID: ${row.employeeid}, Role: ${row.role}, Branch: ${row.branchname})`);
    });

    pool.end();
  } catch (err) {
    console.error('ERROR:', err.message);
    pool.end();
  }
}

compareEmployees();
