const pool = require('./config/db');

async function checkSchema() {
  try {
    // Check companymaster columns
    const cmResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'companymaster'
      ORDER BY ordinal_position
    `);
    
    console.log('=== COMPANYMASTER COLUMNS ===');
    cmResult.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type}) nullable=${row.is_nullable} default=${row.column_default}`);
    });

    // Check for primary key
    const pkResult = await pool.query(`
      SELECT a.attname FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid
      AND a.attnum = ANY(i.indkey)
      WHERE i.indrelname = 'companymaster_pkey'
    `);
    
    console.log('\n=== PRIMARY KEY ===');
    if (pkResult.rows.length > 0) {
      pkResult.rows.forEach(row => console.log(row.attname));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
