const pool = require('./backend/config/db');

async function checkCompanyMasterColumns() {
  try {
    const result = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'companymaster' 
       ORDER BY ordinal_position`
    );

    console.log('Columns in companymaster table:');
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.column_name}`);
    });

    console.log('\n--- Sample data from companymaster ---');
    const dataResult = await pool.query('SELECT * FROM companymaster LIMIT 1');
    if (dataResult.rows.length > 0) {
      console.log(JSON.stringify(dataResult.rows[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCompanyMasterColumns();
