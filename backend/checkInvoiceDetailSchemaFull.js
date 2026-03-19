const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Project1db',
});

async function checkSchema() {
  try {
    const query = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'invoicedetail' 
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(query);
    
    console.log('\n=== INVOICEDETAIL TABLE SCHEMA ===\n');
    console.log(`Total columns: ${result.rows.length}\n`);
    
    console.log('Column Details:');
    console.log('─'.repeat(120));
    
    result.rows.forEach((row, index) => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? `DEFAULT: ${row.column_default}` : '';
      const charLength = row.character_maximum_length ? ` (${row.character_maximum_length})` : '';
      
      console.log(`${index + 1}. ${row.column_name}`);
      console.log(`   Type: ${row.data_type}${charLength}`);
      console.log(`   Nullable: ${nullable}`);
      if (defaultVal) console.log(`   ${defaultVal}`);
      console.log('');
    });
    
    console.log('─'.repeat(120));
    console.log('\nFull table information:');
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(30)} | ${row.data_type.padEnd(20)} | ${row.is_nullable}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
