const pool = require('./config/db');

async function checkSchema() {
  try {
    console.log('\n=== EmployeeMaster Schema ===\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'employeemaster'
      ORDER BY ordinal_position
    `);
    
    result.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n=== Sample Employee Data ===\n');
    const dataRes = await pool.query('SELECT employeeid, firstname, lastname, role, branchid FROM employeemaster WHERE deletedat IS NULL LIMIT 3');
    console.table(dataRes.rows);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkSchema();
