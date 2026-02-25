const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true }
});

async function checkRenderData() {
  try {
    // Check local first
    const localDb = require('./config/db');
    
    console.log('LOCAL vehiclemaster (unique models):');
    localDb.query(
      'SELECT DISTINCT modelname FROM vehiclemaster WHERE deletedat IS NULL ORDER BY modelname',
      (err, res) => {
        if (err) {
          console.error('Error:', err.message);
        } else {
          console.log('Count:', res.rows.length);
          res.rows.forEach(r => console.log('  -', r.modelname));
        }
        
        // Now check Render
        console.log('\nRENDER vehiclemaster data:');
        checkRender();
      }
    );
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function checkRender() {
  try {
    const result = await renderPool.query(
      'SELECT DISTINCT modelname FROM vehiclemaster WHERE deletedat IS NULL ORDER BY modelname'
    );
    
    console.log('Count:', result.rows.length);
    result.rows.forEach(r => console.log('  -', r.modelname));
    
    await renderPool.end();
  } catch (err) {
    console.log('Error checking Render:', err.message);
    try {
      await renderPool.end();
    } catch (e) {}
  }
}

checkRenderData();
