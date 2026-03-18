/**
 * Direct Database Migration - Add Employee 15 to Render
 * Run this locally to directly migrate employee data to Render
 */

const pool = require('./backend/config/db');

async function migrateEmployee15() {
  const client = await pool.connect();
  
  try {
    console.log('[MIGRATE] Starting direct employee 15 migration...\n');
    
    // Step 1: Check current employees
    console.log('[STEP 1] Checking current employees in Render...');
    const before = await client.query('SELECT COUNT(*) as count FROM employeemaster WHERE deletedat IS NULL');
    console.log(`  Current active employees: ${before.rows[0].count}`);
    
    // Step 2: Check if employee 15 exists
    console.log('\n[STEP 2] Checking if employee 15 exists...');
    const emp15Check = await client.query('SELECT * FROM employeemaster WHERE employeeid = 15 AND deletedat IS NULL');
    
    if (emp15Check.rows.length > 0) {
      console.log('  ✓ Employee 15 already exists');
      console.log(`    Name: ${emp15Check.rows[0].firstname} ${emp15Check.rows[0].lastname}`);
    } else {
      console.log('  ✗ Employee 15 not found, will add...');
      
      // Step 3: Insert employee 15
      console.log('\n[STEP 3] Inserting employee 15...');
      
      const insertResult = await client.query(`
        INSERT INTO employeemaster (
          employeeid, branchid, firstname, lastname, employeetype, 
          role, role_type, dateofjoining, createdby, createdat, 
          updatedby, updatedat, isactive, deletedat
        ) VALUES (
          15, 2, 'Shanmugam', 'Ramanathan', 'Employee',
          true, 'Employee', '2026-02-25'::DATE, 1, CURRENT_TIMESTAMP,
          12, CURRENT_TIMESTAMP, true, NULL
        )
        ON CONFLICT (employeeid) DO UPDATE SET deletedat = NULL
        RETURNING employeeid, firstname, lastname
      `);
      
      console.log('  ✓ Employee 15 added successfully');
      console.log(`    ID: ${insertResult.rows[0].employeeid}`);
      console.log(`    Name: ${insertResult.rows[0].firstname} ${insertResult.rows[0].lastname}`);
    }
    
    // Step 4: Verify final count
    console.log('\n[STEP 4] Verifying final employee count...');
    const after = await client.query('SELECT COUNT(*) as count FROM employeemaster WHERE deletedat IS NULL');
    console.log(`  Total active employees: ${after.rows[0].count}`);
    
    // Step 5: List all employees for verification
    console.log('\n[STEP 5] All active employees:');
    const allEmps = await client.query(`
      SELECT employeeid, firstname, lastname, branchid 
      FROM employeemaster 
      WHERE deletedat IS NULL 
      ORDER BY employeeid
    `);
    
    allEmps.rows.forEach((emp, idx) => {
      console.log(`  ${idx + 1}. ID ${emp.employeeid}: ${emp.firstname} ${emp.lastname} (Branch: ${emp.branchid})`);
    });
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Go to Role Management page in Render');
    console.log('  2. Refresh the page (F5)');
    console.log('  3. Employee 15 should now appear in the list\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrateEmployee15();
