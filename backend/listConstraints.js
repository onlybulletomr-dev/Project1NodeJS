const pool = require('./config/db');

async function checkAllConstraints() {
  try {
    console.log('=== All Constraints ===');
    const allConstraints = await pool.query(
      `SELECT constraint_name, constraint_type 
       FROM information_schema.table_constraints 
       WHERE table_name = 'paymentdetail' 
       ORDER BY constraint_name`
    );
    allConstraints.rows.forEach(row => {
      console.log(`${row.constraint_type}: ${row.constraint_name}`);
    });

    console.log('\n=== Checking fk_payment_detail_vehicle FK ===');
    const fkDetail = await pool.query(
      `SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_col
       FROM information_schema.key_column_usage kcu
       JOIN information_schema.constraint_column_usage ccu 
         ON kcu.constraint_name = ccu.constraint_name
       WHERE kcu.constraint_name = 'fk_payment_detail_vehicle'`
    );
    if (fkDetail.rows.length > 0) {
      fkDetail.rows.forEach(row => {
        console.log(`${row.column_name} -> ${row.foreign_table}.${row.foreign_col}`);
      });
    } else {
      console.log('Constraint does not exist');
    }

  } catch(err) { 
    console.error('Error:', err.message); 
  }
  process.exit(0);
}
checkAllConstraints();
