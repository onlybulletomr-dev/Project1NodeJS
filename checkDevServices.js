require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/db');

async function checkDevServices() {
  try {
    console.log('=== CHECKING DEV ENVIRONMENT SERVICES ===\n');
    
    const result = await pool.query(`
      SELECT serviceid, servicenumber, servicename, description, defaultrate
      FROM servicemaster 
      WHERE serviceid IN (1, 2, 3) 
      ORDER BY serviceid
    `);
    
    console.log('Services 1, 2, 3 in DEV:\n');
    if (result.rows.length === 0) {
      console.log('No services found with IDs 1, 2, 3');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.serviceid}`);
        console.log(`  Number: ${row.servicenumber}`);
        console.log(`  Name: ${row.servicename}`);
        console.log(`  Description: ${row.description}`);
        console.log(`  Rate: ₹${row.defaultrate}\n`);
      });
      
      console.log('\nJSON format for Render:');
      console.log(JSON.stringify(result.rows, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDevServices();
