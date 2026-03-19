const pool = require('./config/db');

async function verifyTable() {
  try {
    const client = await pool.connect();
    
    console.log('\n=== SerialNumber Table Structure ===\n');
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'serialnumber' 
      ORDER BY ordinal_position
    `);
    
    console.table(res.rows);
    
    console.log('\n=== Table Constraints ===\n');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'serialnumber'
    `);
    
    console.table(constraints.rows);
    
    console.log('\n=== Foreign Keys ===\n');
    const fks = await client.query(`
      SELECT 
        constraint_name,
        table_name,
        column_name,
        foreign_table_name,
        foreign_column_name
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu 
        ON rc.constraint_name = kcu.constraint_name
      WHERE table_name = 'serialnumber'
    `);
    
    console.table(fks.rows);
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

verifyTable();
