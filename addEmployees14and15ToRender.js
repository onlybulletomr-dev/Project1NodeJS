/**
 * Direct Database Insert for Employees 14 and 15
 * This script connects directly to Render's PostgreSQL database
 * and adds the missing employees
 */

const { Pool } = require('pg');

// Use Render database connection string from environment
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@host:5432/database';

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false  // Required for Render
  }
});

async function addEmployees14and15() {
  const client = await pool.connect();
  
  try {
    console.log('[ADD-EMPLOYEES] Starting to add employees 14 and 15...\n');
    
    const employees = [
      { id: 14, firstname: 'Chandru', lastname: 'Murugan', branch: 3 },
      { id: 15, firstname: 'Shanmugam', lastname: 'Ramanathan', branch: 2 }
    ];
    
    for (const emp of employees) {
      console.log(`[${emp.id}] Inserting ${emp.firstname} ${emp.lastname}...`);
      
      const result = await client.query(`
        INSERT INTO employeemaster (
          employeeid, branchid, firstname, lastname, employeetype,
          role, role_type, dateofjoining, createdby, createdat,
          updatedby, updatedat, isactive, deletedat
        ) VALUES (
          $1, $2, $3, $4, 'Employee',
          true, 'Employee', CURRENT_DATE, 1, CURRENT_TIMESTAMP,
          12, CURRENT_TIMESTAMP, true, NULL
        )
        ON CONFLICT (employeeid) DO UPDATE 
        SET deletedat = NULL, isactive = true, updatedat = CURRENT_TIMESTAMP
        RETURNING employeeid, firstname, lastname
      `, [emp.id, emp.branch, emp.firstname, emp.lastname]);
      
      console.log(`    ✓ Employee ${result.rows[0].employeeid}: ${result.rows[0].firstname} ${result.rows[0].lastname}\n`);
    }
    
    // Get final count
    const countResult = await client.query('SELECT COUNT(*) as count FROM employeemaster WHERE deletedat IS NULL');
    const totalEmployees = parseInt(countResult.rows[0].count);
    
    console.log('✅ Success!\n');
    console.log(`Total active employees now: ${totalEmployees}`);
    console.log('\nNext step: Refresh your Role Management page in Render');
    console.log('All 15 employees should now be visible!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

addEmployees14and15();
