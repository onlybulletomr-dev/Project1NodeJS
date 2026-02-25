const pool = require('../config/db');

async function checkCredentialsTable() {
  try {
    console.log('\n========== CHECKING EMPLOYEECREDENTIALS TABLE ==========\n');

    // Check if table exists
    const tableExistQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employeecredentials'
      ) as table_exists;
    `;
    
    const tableResult = await pool.query(tableExistQuery);
    console.log(`✓ Table exists: ${tableResult.rows[0].table_exists}`);

    // If table exists, check records
    if (tableResult.rows[0].table_exists) {
      const countQuery = 'SELECT COUNT(*) as record_count FROM employeecredentials;';
      const countResult = await pool.query(countQuery);
      console.log(`✓ Records in table: ${countResult.rows[0].record_count}`);

      // List all records
      const listQuery = `
        SELECT ec.credentialid, em.FirstName, ec.passwordhash 
        FROM employeecredentials ec
        JOIN EmployeeMaster em ON ec.employeeid = em.EmployeeID
        LIMIT 5;
      `;
      const listResult = await pool.query(listQuery);
      console.log('\n✓ Sample credentials:');
      listResult.rows.forEach(row => {
        console.log(`  - ${row.firstname}: ${row.passwordhash.substring(0, 20)}...`);
      });
    }

    // Check EmployeeMaster
    const employeeQuery = `SELECT COUNT(*) as emp_count FROM EmployeeMaster WHERE DeletedAt IS NULL;`;
    const empResult = await pool.query(employeeQuery);
    console.log(`\n✓ Active employees: ${empResult.rows[0].emp_count}`);

    console.log('\n========== CHECK COMPLETE ==========\n');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkCredentialsTable();
