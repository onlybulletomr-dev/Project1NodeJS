const pool = require('./backend/config/db');

pool.query(
  `SELECT employeeid, firstname, lastname, createdat 
   FROM employeemaster 
   WHERE DATE(createdat) = CURRENT_DATE 
   ORDER BY createdat DESC;`,
  (err, res) => {
    if (err) {
      console.error('ERROR:', err);
    } else {
      console.log('\n=== NEW EMPLOYEES CREATED TODAY ===\n');
      if (res.rows.length === 0) {
        console.log('No employees created today. All 15 employees were created in the past.');
      } else {
        res.rows.forEach(row => {
          console.log(`ID: ${row.employeeid} | Name: ${row.firstname} ${row.lastname} | Created: ${row.createdat}`);
        });
      }
    }
    pool.end();
  }
);
