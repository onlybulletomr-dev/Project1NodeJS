const pool = require('./config/db');

async function checkEmployeeMasterColumns() {
  try {
    console.log ('Checking EmployeeMaster table...\n');
    
    // First, get all column names
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employeemaster'
      ORDER BY ordinal_position
    `);
    
    if (columnsResult.rows.length === 0) {
      console.log('EmployeeMaster table not found. Checking for alternative names...');
      const altResult = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
        ORDER BY table_name
      `);
      console.log('Available tables:');
      altResult.rows.forEach(t => console.log(' - ' + t.table_name));
    } else {
      console.log('=== EmployeeMaster Columns ===');
      columnsResult.rows.forEach(row => {
        console.log(`${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      console.log('\n=== Sample Employee Data ===');
      const dataResult = await pool.query('SELECT * FROM employeemaster WHERE "DeletedAt" IS NULL LIMIT 1');
      if (dataResult.rows.length > 0) {
        console.log(JSON.stringify(dataResult.rows[0], null, 2));
      } else {
        console.log('No active employee records found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkEmployeeMasterColumns();
