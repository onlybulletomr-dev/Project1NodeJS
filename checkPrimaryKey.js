const pool = require('./backend/config/db');

async function checkPrimaryKey() {
  try {
    const result = await pool.query(`
      SELECT
        constraint_name,
        constraint_type,
        column_name
      FROM information_schema.key_column_usage
      JOIN information_schema.table_constraints USING (constraint_name, constraint_schema, table_name)
      WHERE table_name = 'invoicedetail'
      ORDER BY constraint_type, constraint_name
    `);
    
    console.log('InvoiceDetail Constraints:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPrimaryKey();
