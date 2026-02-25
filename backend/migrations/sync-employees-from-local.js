/**
 * Migration script to export employee data from local database
 * This data can be used to sync to Render production
 */

const pool = require('../config/db');

async function exportEmployeeData() {
  try {
    console.log('[EXPORT] Fetching all active employees from local...');
    
    const result = await pool.query(`
      SELECT 
        employeeid,
        firstname,
        lastname,
        branchid,
        deletedat
      FROM employeemaster
      WHERE deletedat IS NULL
      ORDER BY employeeid LIMIT 20
    `);
    
    const employees = result.rows;
    console.log(`\n[EXPORT] Found ${employees.length} active employees\n`);
    
    const sqlInsertStatements = employees.map(emp => {
      const values = [
        emp.employeeid,
        `'${emp.firstname}'`,
        `'${emp.lastname}'`,
        emp.branchid
      ].join(', ');
      
      return `INSERT INTO employeemaster (employeeid, firstname, lastname, branchid) VALUES (${values}) ON CONFLICT (employeeid) DO NOTHING;`;
    });
    
    console.log('=== SQL INSERT STATEMENTS FOR RENDER ===\n');
    sqlInsertStatements.forEach(sql => console.log(sql));
    
    console.log('\n=== JAVASCRIPT ARRAY FOR SEED ENDPOINT ===\n');
    console.log('const seedEmployees = [');
    employees.forEach((emp, idx) => {
      console.log(`  { employeeid: ${emp.employeeid}, firstname: '${emp.firstname}', lastname: '${emp.lastname}', branchid: ${emp.branchid} }${idx < employees.length - 1 ? ',' : ''}`);
    });
    console.log('];');
    
    console.log('\n[EXPORT] Export complete!');
    process.exit(0);
    
  } catch (err) {
    console.error('[EXPORT] Error:', err.message);
    process.exit(1);
  }
}

exportEmployeeData();
