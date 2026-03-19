/**
 * Reinitialize Employee Credentials
 * Creates login credentials for all employees
 */

const pool = require('./backend/config/db');
const bcrypt = require('bcryptjs');

async function initializeCredentials() {
  const client = await pool.connect();
  
  try {
    console.log('[CRED-INIT] Reinitializing employee credentials...\n');
    
    // Step 1: Get all active employees
    console.log('[STEP 1] Fetching all active employees...');
    const empResult = await client.query(`
      SELECT employeeid, firstname, lastname 
      FROM employeemaster 
      WHERE deletedat IS NULL 
      ORDER BY employeeid
    `);
    
    const employees = empResult.rows;
    console.log(`  Found ${employees.length} active employees\n`);
    
    // Step 2: Hash default password
    const defaultPassword = 'Default@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log('[STEP 2] Password hashed\n');
    
    // Step 3: Clear existing credentials
    console.log('[STEP 3] Clearing old credentials...');
    await client.query('DELETE FROM employeecredentials');
    console.log('  ✓ Cleared old credentials\n');
    
    // Step 4: Insert new credentials for each employee
    console.log('[STEP 4] Creating credentials for each employee...');
    let createdCount = 0;
    
    for (const emp of employees) {
      await client.query(`
        INSERT INTO employeecredentials (employeeid, username, password)
        VALUES ($1, $2, $3)
      `, [emp.employeeid, emp.firstname, hashedPassword]);
      
      createdCount++;
      console.log(`  ${createdCount}. ${emp.firstname} ${emp.lastname} (ID: ${emp.employeeid})`);
    }
    
    console.log(`\n  ✓ Created ${createdCount} credential entries\n`);
    
    // Step 5: Verify
    console.log('[STEP 5] Verifying credentials...');
    const credCheck = await client.query('SELECT COUNT(*) as count FROM employeecredentials');
    console.log(`  Total credentials in database: ${credCheck.rows[0].count}\n`);
    
    console.log('✅ Credentials initialization complete!\n');
    console.log('Login Instructions:');
    console.log('===================');
    employees.forEach(emp => {
      console.log(`  Username: ${emp.firstname}`);
      console.log(`  Password: ${defaultPassword}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

initializeCredentials();
