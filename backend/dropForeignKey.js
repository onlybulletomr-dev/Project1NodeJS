const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db',
});

async function dropConstraint() {
  try {
    console.log('Attempting to drop fk_detail_item constraint...');
    await pool.query('ALTER TABLE InvoiceDetail DROP CONSTRAINT IF EXISTS fk_detail_item;');
    console.log('✓ Foreign key constraint dropped successfully!');
    
    console.log('\nVerifying InvoiceDetail table structure...');
    const result = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'invoicedetail'
    `);
    
    console.log('Constraints on InvoiceDetail table:');
    console.log(result.rows);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

dropConstraint();
