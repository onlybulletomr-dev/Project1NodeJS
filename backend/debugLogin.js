const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function debug() {
  try {
    // Check ashok
    console.log('=== Finding ASHOK ===');
    const ashokResult = await pool.query(
      `SELECT EmployeeID as employeeid, FirstName as firstname, LastName as lastname FROM EmployeeMaster 
       WHERE FirstName ILIKE $1 OR LastName ILIKE $1`,
      ['%ashok%']
    );
    console.log('Ashok record:', ashokResult.rows[0]);

    if (ashokResult.rows.length === 0) {
      console.log('No ashok found!');
      process.exit(1);
    }

    const ashokId = ashokResult.rows[0].employeeid;
    
    // Check credentials
    console.log('\n=== Finding Credentials ===');
    const credResult = await pool.query(
      'SELECT * FROM employeecredentials WHERE employeeid = $1',
      [ashokId]
    );
    console.log('Credential record:', credResult.rows[0]);

    if (credResult.rows.length === 0) {
      console.log('No credentials found for ashok!');
      process.exit(1);
    }

    const storedHash = credResult.rows[0].passwordhash;
    console.log('Stored hash:', storedHash);

    // Test password comparison
    console.log('\n=== Testing Password Comparison ===');
    const testPassword = 'Default@123';
    const match = await bcrypt.compare(testPassword, storedHash);
    console.log(`Password match (${testPassword}):`, match);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debug();
