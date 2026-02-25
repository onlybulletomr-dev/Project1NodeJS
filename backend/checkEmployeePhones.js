const pool = require('./config/db');

async function checkEmployeeData() {
  try {
    console.log('Checking Employee Data...');
    const result = await pool.query(
      'SELECT EmployeeID, FirstName, LastName, PhoneNumber, Email FROM EmployeeMaster WHERE DeletedAt IS NULL LIMIT 10'
    );
    
    console.log('\n=== Employee Data Found ===');
    result.rows.forEach((emp, idx) => {
      console.log(`\n${idx + 1}. ${emp.firstname || emp.FirstName} ${emp.lastname || emp.LastName}`);
      console.log(`   ID: ${emp.employeeid || emp.EmployeeID}`);
      console.log(`   Phone: ${emp.phonenumber || emp.PhoneNumber}`);
      console.log(`   Email: ${emp.email || emp.Email}`);
    });
    
    console.log('\n✓ Employee data check completed');
  } catch (error) {
    console.error('Error checking employee data:', error.message);
  } finally {
    process.exit(0);
  }
}

checkEmployeeData();
