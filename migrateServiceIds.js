#!/usr/bin/env node

/**
 * Database Migration: Reset Service ID Sequence
 * This script renumbers all service IDs starting from 1
 * 
 * Usage: node migrateServiceIds.js
 * 
 * Set environment variables for Render database:
 *   RENDER_DB_HOST
 *   RENDER_DB_PORT
 *   RENDER_DB_USER
 *   RENDER_DB_PASSWORD
 *   RENDER_DB_NAME
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Use Render database credentials if available, otherwise fall back to local
const pool = new Pool({
  user: process.env.RENDER_DB_USER || process.env.DB_USER,
  password: process.env.RENDER_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.RENDER_DB_HOST || process.env.DB_HOST,
  port: process.env.RENDER_DB_PORT || process.env.DB_PORT,
  database: process.env.RENDER_DB_NAME || process.env.DB_NAME,
  ssl: process.env.RENDER_DB_HOST ? { rejectUnauthorized: false } : false,
});

async function migrateServiceIds() {
  const client = await pool.connect();
  
  try {
    console.log('=== SERVICE ID MIGRATION ===\n');
    console.log('Database:', process.env.RENDER_DB_NAME || process.env.DB_NAME);
    console.log('Host:', process.env.RENDER_DB_HOST || process.env.DB_HOST);
    console.log();
    
    // Start transaction
    await client.query('BEGIN');
    console.log('✓ Transaction started\n');
    
    // Step 1: Renumber all existing service IDs
    console.log('Step 1: Renumbering all existing service IDs starting from 1...');
    await client.query(`
      WITH numbered_services AS (
        SELECT serviceid, ROW_NUMBER() OVER (ORDER BY serviceid) as new_id
        FROM servicemaster
      )
      UPDATE servicemaster SET serviceid = numbered_services.new_id
      FROM numbered_services
      WHERE servicemaster.serviceid = numbered_services.serviceid;
    `);
    const updateResult = await client.query('SELECT COUNT(*) as count FROM servicemaster');
    console.log(`✓ Updated ${updateResult.rows[0].count} records\n`);
    
    // Step 2: Reset the sequence
    console.log('Step 2: Resetting the sequence...');
    const maxResult = await client.query('SELECT MAX(serviceid) as max_id FROM servicemaster');
    const nextId = parseInt(maxResult.rows[0].max_id) + 1;
    await client.query(`ALTER SEQUENCE servicemaster_serviceid_seq RESTART WITH ${nextId}`);
    console.log('✓ Sequence reset complete\n');
    
    // Step 3: Verify the result
    console.log('Step 3: Verifying the result...');
    const verifyResult = await client.query(`
      SELECT MIN(serviceid) as min_id, MAX(serviceid) as max_id, COUNT(*) as total_count
      FROM servicemaster;
    `);
    
    const { min_id, max_id, total_count } = verifyResult.rows[0];
    console.log(`✓ Service IDs now range from ${min_id} to ${max_id}`);
    console.log(`✓ Total service records: ${total_count}\n`);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('=== MIGRATION COMPLETED SUCCESSFULLY! ===\n');
    console.log('Summary:');
    console.log(`  - Service IDs renumbered: ${total_count}`);
    console.log(`  - New range: ${min_id} to ${max_id}`);
    console.log(`  - Next insert will use ID: ${nextId}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateServiceIds();
