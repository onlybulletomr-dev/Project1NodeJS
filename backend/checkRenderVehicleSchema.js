const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('Checking vehicledetail table schema...\n');
    
    const result = await renderPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicledetail' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in vehicledetail table:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Check a sample row
    console.log('\nSample data:');
    const dataResult = await renderPool.query(
      'SELECT * FROM vehicledetail LIMIT 1'
    );
    
    if (dataResult.rows.length > 0) {
      const sample = dataResult.rows[0];
      console.log('First row keys:', Object.keys(sample));
      console.log('First row data:', sample);
    }
    
    // Check for model and color values
    console.log('\nChecking model and color data:');
    const modelsResult = await renderPool.query(
      'SELECT DISTINCT vehiclemodel FROM vehicledetail WHERE deletedat IS NULL AND vehiclemodel IS NOT NULL LIMIT 5'
    );
    console.log('Models found:', modelsResult.rows);
    
    const colorsResult = await renderPool.query(
      'SELECT DISTINCT vehiclecolor FROM vehicledetail WHERE deletedat IS NULL AND vehiclecolor IS NOT NULL LIMIT 5'
    );
    console.log('Colors found:', colorsResult.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await renderPool.end();
  }
}

checkSchema();
