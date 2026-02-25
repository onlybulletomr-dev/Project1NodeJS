const pool = require('./config/db');

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name='employeemaster' 
      ORDER BY ordinal_position
    `);
    
    console.log('EmployeeMaster columns:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
