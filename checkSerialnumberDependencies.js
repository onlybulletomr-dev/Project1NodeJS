const pool = require('./backend/config/db');

async function checkSerialnumberDependencies() {
  try {
    console.log('=== Checking serialnumber table structure ===\n');
    
    // Get constraints
    const constraintResult = await pool.query(`
      SELECT
        constraint_name,
        constraint_type,
        column_name
      FROM information_schema.key_column_usage
      JOIN information_schema.table_constraints USING (constraint_name, constraint_schema, table_name)
      WHERE table_name = 'serialnumber'
      ORDER BY constraint_type DESC, constraint_name
    `);
    
    console.log('Constraints on serialnumber table:');
    console.log(JSON.stringify(constraintResult.rows, null, 2));
    
    // Get foreign key details
    console.log('\n\nForeign Key Details:');
    const fkResult = await pool.query(`
      SELECT
        constraint_name,
        table_name,
        column_name,
        referenced_table_name,
        referenced_column_name
      FROM information_schema.key_column_usage  
      WHERE table_name = 'serialnumber' AND constraint_type = 'FOREIGN KEY'
    `);
    
    if (fkResult.rows.length === 0) {
      const altResult = await pool.query(`
        SELECT
          con.conname,
          a.attname as column_name,
          c.relname as referenced_table,
          b.attname as referenced_column
        FROM pg_class t
        JOIN pg_constraint con ON con.conrelid = t.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(con.conkey)
        JOIN pg_class c ON c.oid = con.confrelid
        JOIN pg_attribute b ON b.attrelid = c.oid AND b.attnum = ANY(con.confkey)
        WHERE t.relname = 'serialnumber'
        AND con.contype = 'f'
      `);
      
      console.log(JSON.stringify(altResult.rows, null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkSerialnumberDependencies();
