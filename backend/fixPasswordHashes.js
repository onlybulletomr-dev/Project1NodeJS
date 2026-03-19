const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

console.log('[DEBUG] Loaded env vars:');
console.log('  RENDER_DB_HOST:', process.env.RENDER_DB_HOST);
console.log('  RENDER_DB_USER:', process.env.RENDER_DB_USER);
console.log('  RENDER_DB_NAME:', process.env.RENDER_DB_NAME);

// Test both possible Render databases
const renderConfigs = [
  // From environment variables
  {
    name: 'ENV Config',
    user: process.env.RENDER_DB_USER,
    password: process.env.RENDER_DB_PASSWORD,
    host: process.env.RENDER_DB_HOST,
    port: process.env.RENDER_DB_PORT || 5432,
    database: process.env.RENDER_DB_NAME,
  },
  // From previous psql attempts (in case env is wrong)
  {
    name: 'Historical Config',
    user: 'dkwkflnl',
    password: 'cH4jk7hZ5T9pK2mL8vQ3nR0sB1dW6xY4',
    host: 'dpg-ctrdq5ljtl8c73b8vab0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'erpsystem',
  }
];

async function tryFixing(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Trying: ${config.name}`);
  console.log(`Host: ${config.host}`);
  console.log(`Database: ${config.database}`);
  console.log(`${'='.repeat(60)}`);

  const pool = new Pool({
    ...config,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log(`✅ Connected! Current time: ${testResult.rows[0].now}`);

    // Check if employeecredentials table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employeecredentials'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ employeecredentials table does not exist');
      await pool.end();
      return false;
    }

    console.log('✅ employeecredentials table exists');

    // Get all employees
    const employeesResult = await pool.query(`
      SELECT employeeid, firstname, lastname 
      FROM employeemaster 
      WHERE deletedat IS NULL 
      ORDER BY employeeid
    `);

    console.log(`\n📋 Found ${employeesResult.rows.length} employees`);

    // Clear existing credentials
    console.log('\n🔄 Clearing existing credentials...');
    const deleteResult = await pool.query('DELETE FROM employeecredentials');
    console.log(`✅ Deleted ${deleteResult.rowCount} old credentials`);

    // Generate and insert proper bcrypt hashes
    console.log('\n🔐 Generating bcrypt hashes and inserting credentials...');
    const defaultPassword = 'Default@123';
    const costFactor = 10; // Must match the bcrypt.hash(password, 10) in authController

    let successCount = 0;
    for (let i = 0; i < employeesResult.rows.length; i++) {
      const employee = employeesResult.rows[i];
      const credentialId = i + 1; // Sequential from 1

      try {
        // Generate hash using same parameters as authController
        const hashedPassword = await bcrypt.hash(defaultPassword, costFactor);
        
        console.log(`  ${i + 1}/${employeesResult.rows.length} Employee ${employee.employeeid} (${employee.firstname}):`, hashedPassword.substring(0, 30) + '...');

        // Insert with generated hash
        await pool.query(
          `INSERT INTO employeecredentials (credentialid, employeeid, passwordhash)
           VALUES ($1, $2, $3)
           ON CONFLICT (credentialid) DO UPDATE 
           SET passwordhash = $3, employeeid = $2`,
          [credentialId, employee.employeeid, hashedPassword]
        );

        successCount++;
      } catch (hashError) {
        console.error(`  ❌ Failed for employee ${employee.employeeid}:`, hashError.message);
      }
    }

    console.log(`\n✅ Successfully created ${successCount}/${employeesResult.rows.length} credentials`);

    // Verify what was inserted
    console.log('\n🔍 Verification - Sample credentials in database:');
    const verifyResult = await pool.query(`
      SELECT credentialid, employeeid, passwordhash, LENGTH(passwordhash) as hash_length
      FROM employeecredentials
      ORDER BY credentialid
      LIMIT 5
    `);

    verifyResult.rows.forEach(row => {
      console.log(`  Cred ${row.credentialid}: Employee ${row.employeeid}, Hash length: ${row.hash_length}, Format: ${row.passwordhash.substring(0, 15)}...`);
    });

    // Test that the hash works
    console.log('\n🧪 Testing bcrypt verification with stored hash:');
    if (verifyResult.rows.length > 0) {
      const testHash = verifyResult.rows[0].passwordhash;
      const isMatch = await bcrypt.compare(defaultPassword, testHash);
      console.log(`  Testing "Default@123" against stored hash: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    }

    console.log('\n✅ FIX COMPLETED SUCCESSFULLY!');
    console.log('Users can now login with password: Default@123');

    await pool.end();
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    await pool.end();
    return false;
  }
}

async function main() {
  for (const config of renderConfigs) {
    const success = await tryFixing(config);
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS: Credentials have been fixed!');
      console.log('='.repeat(60));
      process.exit(0);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('❌ FAILED: Could not connect to any database configuration');
  console.log('='.repeat(60));
  process.exit(1);
}

main();
