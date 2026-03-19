const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db'
});

async function checkServiceIds() {
  try {
    // Check GS services
    const result = await pool.query(
      `SELECT serviceid, servicenumber, servicename FROM servicemaster 
       WHERE serviceid IN (1, 2, 3) OR servicename IN ('WATER WASH', 'CONSUMABLES', 'GENERAL SERVICE')
       ORDER BY serviceid`
    );
    console.log('GS Services (local database):');
    console.log(JSON.stringify(result.rows, null, 2));

    // Also check if there are any services with IDs 340, 341, 342
    const result2 = await pool.query(
      `SELECT serviceid, servicenumber, servicename FROM servicemaster 
       WHERE serviceid IN (340, 341, 342)
       ORDER BY serviceid`
    );
    if (result2.rows.length > 0) {
      console.log('\nServices with IDs 340, 341, 342 (if any):');
      console.log(JSON.stringify(result2.rows, null, 2));
    } else {
      console.log('\nNo services found with IDs 340, 341, 342');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkServiceIds();
