const pg = require('pg');
const client = new pg.Client({
  host: 'localhost',
  user: 'postgres',
  password: 'admin',
  database: 'Project1db'
});

async function checkStructure() {
  try {
    await client.connect();
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoicedetail' 
      ORDER BY ordinal_position;
    `);
    
    console.log('invoicedetail table columns:');
    console.table(result.rows);
    
    // Also check constraints
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'invoicedetail'
      ORDER BY column_name;
    `);
    
    console.log('\ninvoicedetail table constraints:');
    console.table(constraints.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkStructure();
