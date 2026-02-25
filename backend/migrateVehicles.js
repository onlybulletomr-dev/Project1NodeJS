const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'Project1db',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('\n🔄 CHECKING VEHICLES:\n');
    
    const localVehicles = await localPool.query('SELECT * FROM vehicledetail');
    console.log(`✅ Local: ${localVehicles.rows.length} vehicles`);
    localVehicles.rows.forEach((v, i) => {
      console.log(`   ${i+1}. CustID=${v.customerid}, Num=${v.vehiclenumber}`);
    });
    
    const renderVehicles = await renderPool.query('SELECT * FROM vehicledetail');
    console.log(`\n❌ Render: ${renderVehicles.rows.length} vehicles (MISSING!)\n`);
    
    if (localVehicles.rows.length > 0 && renderVehicles.rows.length === 0) {
      console.log('🔄 MIGRATING VEHICLES TO RENDER:\n');
      
      const cols = Object.keys(localVehicles.rows[0]);
      let migrated = 0;
      
      for (const row of localVehicles.rows) {
        const vals = cols.map(c => row[c]);
        const params = cols.map((_, i) => `$${i + 1}`).join(', ');
        const insert = `INSERT INTO vehicledetail (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${params})`;
        
        try {
          await renderPool.query(insert, vals);
          migrated++;
          console.log(`   ✓ Vehicle ${row.vehiclenumber} (Customer ${row.customerid})`);
        } catch (e) {
          console.log(`   ✗ Error: ${e.message.substring(0, 50)}`);
        }
      }
      
      console.log(`\n✅ Migrated ${migrated} vehicles!\n`);
    }
    
    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

migrate();
