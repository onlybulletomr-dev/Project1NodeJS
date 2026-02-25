const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('\n📊 RENDER DATABASE DATA:\n');
    
    const customers = await renderPool.query('SELECT * FROM customermaster ORDER BY customerid');
    console.log(`📝 Customers: ${customers.rows.length}`);
    customers.rows.forEach((c, i) => {
      console.log(`   ${i+1}. ID=${c.customerid}, ${c.firstname || c.customername || 'Unknown'}`);
    });
    
    const vehicles = await renderPool.query('SELECT * FROM vehicledetail ORDER BY vehicledetailid');
    console.log(`\n🚗 Vehicles: ${vehicles.rows.length}`);
    vehicles.rows.forEach((v, i) => {
      const num = v.vehiclenumber || v.registrationnumber || 'N/A';
      console.log(`   ${i+1}. ID=${v.vehicledetailid}, CustID=${v.customerid}, Number=${num}`);
    });
    
    console.log(`\n🔗 Testing: Get vehicles for customer 50`);
    const result = await renderPool.query(
      'SELECT * FROM vehicledetail WHERE customerid = $1',
      [50]
    );
    console.log(`   Found: ${result.rows.length} vehicles`);
    
    if (result.rows.length > 0) {
      console.log(`\n   First vehicle details:`);
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log(`   No vehicles found for customer 50!\n`);
    }
    
    await renderPool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
