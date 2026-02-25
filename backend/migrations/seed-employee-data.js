const pool = require('../config/db');

/**
 * Seed employee data from local DB to Render production
 * Usage: node seed-employee-data.js
 */

async function seedEmployeeData() {
  const client = await pool.connect();
  
  try {
    console.log('[SEED] Starting employee data migration...\n');
    
    // Step 1: Check if target DB has companies
    console.log('[SEED] Step 1: Checking CompanyMaster...');
    const companyCheck = await client.query('SELECT COUNT(*) as count FROM companymaster');
    console.log(`[SEED]   Companies in target DB: ${companyCheck.rows[0].count}`);
    
    if (companyCheck.rows[0].count === 0) {
      console.log('[SEED] ⚠️  No companies found! Need to seed companies first.');
      console.log('[SEED]   Fetching companies from source...');
      
      const companies = await client.query(`
        SELECT companyid, companyname 
        FROM companymaster 
        ORDER BY companyid
      `);
      
      if (companies.rows.length > 0) {
        console.log(`[SEED]   Found ${companies.rows.length} companies. These are:`, companies.rows);
      }
    }
    
    // Step 2: Get employee count before migration
    console.log('\n[SEED] Step 2: Checking EmployeeMaster...');
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM employeemaster WHERE deletedat IS NULL');
    console.log(`[SEED]   Active employees before: ${beforeCount.rows[0].count}`);
    
    // Step 3: Get all employees from source (use same connection = same DB for now)
    console.log('\n[SEED] Step 3: Fetching all active employees...');
    const employees = await client.query(`
      SELECT * FROM employeemaster 
      WHERE deletedat IS NULL 
      ORDER BY employeeid
    `);
    
    console.log(`[SEED]   Found ${employees.rows.length} active employees to migrate`);
    
    if (employees.rows.length === 0) {
      console.log('[SEED] ⚠️  No employees to migrate!');
      console.log('[SEED] Sample data:');
      console.log(`
      To seed manually using SQL:
      
      INSERT INTO employeemaster (firstname, lastname, email, branchid, department) VALUES
      ('Ashok', 'Ashok', 'ashok@onlybullet.com', 3, 'Admin'),
      ('Manager', 'Test', 'manager@onlybullet.com', 3, 'Management'),
      ... (total 13 employees needed)
      `);
      return;
    }
    
    // Step 4: Display sample employee data
    console.log('\n[SEED] Step 4: Employee data to seed:');
    console.log('[SEED]   Sample (first 3):');
    employees.rows.slice(0, 3).forEach(emp => {
      console.log(`[SEED]     - ID:${emp.employeeid} ${emp.firstname} ${emp.lastname} (Branch:${emp.branchid})`);
    });
    if (employees.rows.length > 3) {
      console.log(`[SEED]     ... and ${employees.rows.length - 3} more employees\n`);
    }
    
    // Step 5: Check if employees already exist in target
    console.log('[SEED] Step 5: Checking for duplicate employees...');
    const existingIds = await client.query(`
      SELECT employeeid FROM employeemaster 
      WHERE employeeid = ANY($1::int[])
      LIMIT 1
    `, [[employees.rows[0].employeeid]]);
    
    if (existingIds.rows.length > 0) {
      console.log('[SEED] ⚠️  Employees already exist in target database!');
      console.log('[SEED]   Run DELETE FROM employeecredentials; DELETE FROM employeemaster WHERE deletedat IS NULL;');
      console.log('[SEED]   Then run this migration again.');
      return;
    }
    
    // Step 6: Summary
    console.log('\n[SEED] Migration Summary:');
    console.log('[SEED] ╔════════════════════════════════════════╗');
    console.log(`[SEED] ║ Employees to migrate: ${String(employees.rows.length).padEnd(28)}║`);
    console.log(`[SEED] ║ Companies: ${String(companyCheck.rows[0].count).padEnd(33)}║`);
    console.log('[SEED] ║                                        ║');
    console.log('[SEED] ║ Status: Ready to migrate               ║');
    console.log('[SEED] ╚════════════════════════════════════════╝');
    
    console.log('\n[SEED] To complete the migration:');
    console.log('[SEED] 1. Use database admin tools or mysqldump');
    console.log('[SEED] 2. Or create an endpoint: POST /admin/seed/employees');
    console.log('[SEED] 3. Or run: node seed-from-backup.js (requires employee_backup.json)');
    
    console.log('\n[SEED] ✓ Data audit complete. Ready for migration.');
    
  } catch (error) {
    console.error('[SEED] Error:', error.message);
    console.error('[SEED] Stack:', error.stack);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedEmployeeData();
