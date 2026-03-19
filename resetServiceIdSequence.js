const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function resetServiceIdSequence() {
  const client = await pool.connect();
  
  try {
    console.log('Starting service ID sequence reset...\n');
    
    // Start transaction
    await client.query('BEGIN');
    
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
    console.log('=== Service ID sequence reset successfully! ===');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during reset:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetServiceIdSequence();
