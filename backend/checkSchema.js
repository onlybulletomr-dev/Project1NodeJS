const pool = require('./config/db');

async function checkSchema() {
  try {
    console.log('=== CHECKING PAYMENTDETAIL TABLE SCHEMA ===\n');
    
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'paymentdetail'
      ORDER BY ordinal_position;
    `);
    
    console.log('Column Details:');
    result.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '✓ NULLABLE' : '✗ NOT NULL';
      console.log(`  ${row.column_name}: ${row.data_type} [${nullable}]`);
    });

    // Specifically check invoiceid
    console.log('\n=== INVOICEID COLUMN ===');
    const invoiceIdColumn = result.rows.find(r => r.column_name === 'invoiceid');
    if (invoiceIdColumn) {
      console.log(`Column Name: ${invoiceIdColumn.column_name}`);
      console.log(`Data Type: ${invoiceIdColumn.data_type}`);
      console.log(`Is Nullable: ${invoiceIdColumn.is_nullable}`);
      console.log(`Status: ${invoiceIdColumn.is_nullable === 'YES' ? '✓ ALLOWS NULL' : '✗ DOES NOT ALLOW NULL'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
