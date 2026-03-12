const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function fixServices() {
  const client = await pool.connect();
  
  try {
    console.log('Checking servicemaster table structure...\n');
    
    const columnResult = await client.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'servicemaster' 
      ORDER BY ordinal_position
    `);
    
    console.log('Servicemaster columns:');
    columnResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (nullable: ${row.is_nullable})`);
    });
    console.log();
    
    // Check existing services 1, 2, 3
    console.log('Checking services 1, 2, 3...\n');
    const checkResult = await client.query(`
      SELECT serviceid, servicenumber, servicename, description, defaultrate, billingtype
      FROM servicemaster 
      WHERE serviceid IN (1, 2, 3) 
      ORDER BY serviceid
    `);
    
    console.log('Current services:');
    if (checkResult.rows.length === 0) {
      console.log('  None found - will need to insert');
    } else {
      checkResult.rows.forEach(row => {
        console.log(`  ID ${row.serviceid}: "${row.servicename}" (billing: ${row.billingtype})`);
      });
    }
    
    // Get an existing service to see what billingtype should be
    console.log('\nChecking sample services for billingtype...\n');
    const sampleResult = await client.query(`
      SELECT DISTINCT billingtype FROM servicemaster LIMIT 5
    `);
    
    console.log('Available billingtypes:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ${row.billingtype}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixServices();
