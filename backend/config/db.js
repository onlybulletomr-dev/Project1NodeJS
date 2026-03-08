const { Pool } = require('pg');
require('dotenv').config();

const host = process.env.DB_HOST;
const isLocalhost = !host || host.includes('localhost') || host.includes('127.0.0.1');

console.log('[DB CONFIG] Host:', host);
console.log('[DB CONFIG] Is localhost?', isLocalhost);
console.log('[DB CONFIG] SSL enabled?', !isLocalhost);

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: host,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  // Enable SSL for remote connections (production/Render)
  // Disable for localhost (development)
  ssl: !isLocalhost ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
