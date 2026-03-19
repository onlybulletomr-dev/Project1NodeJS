#!/usr/bin/env node

/**
 * Fix Service Names on Render Database
 * Updates serviceid 1, 2, 3 with proper names for General Service
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Use Render database credentials
const pool = new Pool({
  user: process.env.RENDER_DB_USER || process.env.DB_USER,
  password: process.env.RENDER_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.RENDER_DB_HOST || process.env.DB_HOST,
  port: process.env.RENDER_DB_PORT || process.env.DB_PORT,
  database: process.env.RENDER_DB_NAME || process.env.DB_NAME,
  ssl: process.env.RENDER_DB_HOST ? { rejectUnauthorized: false } : false,
});

async function fixServiceNames() {
  const client = await pool.connect();
  
  try {
    console.log('=== FIXING SERVICE NAMES ON RENDER ===\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // First check what's currently there
    console.log('Current services 1, 2, 3:');
    const checkResult = await client.query(
      `SELECT serviceid, servicenumber, servicename, description, defaultrate 
       FROM servicemaster 
       WHERE serviceid IN (1, 2, 3) 
       ORDER BY serviceid`
    );
    
    if (checkResult.rows.length === 0) {
      console.log('  No services found with IDs 1, 2, 3');
      console.log('\n  Inserting services...');
      
      // Insert the three services
      await client.query(`
        INSERT INTO servicemaster (serviceid, servicenumber, servicename, description, defaultrate, createdby, createdat)
        VALUES 
          (1, 'GS-001', 'Water Wash', 'Water Wash Service', 150.00, 1, NOW()),
          (2, 'GS-002', 'Chemical Charges', 'Chemical Charges', 180.00, 1, NOW()),
          (3, 'GS-003', 'General Service', 'General Service', 880.00, 1, NOW())
        ON CONFLICT (serviceid) DO UPDATE SET
          servicename = EXCLUDED.servicename,
          description = EXCLUDED.description,
          defaultrate = EXCLUDED.defaultrate
      `);
      console.log('  ✓ Services inserted/updated');
    } else {
      console.log('  Found ' + checkResult.rows.length + ' services');
      checkResult.rows.forEach(row => {
        console.log(`    ID: ${row.serviceid}, Name: "${row.servicename}", Description: "${row.description}"`);
      });
      
      // Update them with proper names
      console.log('\n  Updating service names...');
      await client.query(`
        UPDATE servicemaster 
        SET 
          servicename = CASE 
            WHEN serviceid = 1 THEN 'Water Wash'
            WHEN serviceid = 2 THEN 'Chemical Charges'
            WHEN serviceid = 3 THEN 'General Service'
            ELSE servicename
          END,
          description = CASE 
            WHEN serviceid = 1 THEN 'Water Wash Service'
            WHEN serviceid = 2 THEN 'Chemical Charges'
            WHEN serviceid = 3 THEN 'General Service'
            ELSE description
          END,
          defaultrate = CASE 
            WHEN serviceid = 1 THEN 150.00
            WHEN serviceid = 2 THEN 180.00
            WHEN serviceid = 3 THEN 880.00
            ELSE defaultrate
          END
        WHERE serviceid IN (1, 2, 3)
      `);
      console.log('  ✓ Service names updated');
    }
    
    // Verify changes
    console.log('\nVerifying updated services:');
    const verifyResult = await client.query(
      `SELECT serviceid, servicenumber, servicename, description, defaultrate 
       FROM servicemaster 
       WHERE serviceid IN (1, 2, 3) 
       ORDER BY serviceid`
    );
    
    verifyResult.rows.forEach(row => {
      console.log(`  ID ${row.serviceid}: "${row.servicename}" (${row.description}) - ₹${row.defaultrate}`);
    });
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ SERVICE NAMES FIXED SUCCESSFULLY!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:');
    console.error(error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixServiceNames();
