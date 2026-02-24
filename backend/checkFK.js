const pool = require('./config/db');

async function checkFK() {
  try {
    const result = await pool.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'paymentdetail'
      ORDER BY kcu.column_name
    `);
    
    console.log('Foreign Keys in paymentdetail table:');
    console.log('=====================================\n');
    
    if (result.rows.length === 0) {
      console.log('❌ NO FOREIGN KEY CONSTRAINTS FOUND!');
    } else {
      result.rows.forEach(fk => {
        console.log(`FK Name: ${fk.constraint_name}`);
        console.log(`  Column: ${fk.column_name}`);
        console.log(`  References: ${fk.referenced_table}.${fk.referenced_column}`);
        console.log('');
      });
    }

    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

checkFK();
