const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const schemaSQL = fs.readFileSync('../database/schema.sql', 'utf-8');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting database migration...');
    await client.query(schemaSQL);
    console.log('✓ Database migration completed successfully!');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
