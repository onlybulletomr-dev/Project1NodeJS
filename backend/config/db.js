const { Pool } = require('pg');
require('dotenv').config();

const host = process.env.DB_HOST;
const isLocalhost = !host || host.includes('localhost') || host.includes('127.0.0.1');

console.log('[DB CONFIG] Host:', host);
console.log('[DB CONFIG] Is localhost?', isLocalhost);
console.log('[DB CONFIG] SSL enabled?', !isLocalhost);

const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: host,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
};

// Enable SSL for remote connections (production/Render)
// For Render PostgreSQL, disable certificate validation
if (!isLocalhost) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  console.log('[DB CONFIG] Applied SSL with rejectUnauthorized=false for remote database');
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  console.error('[DB ERROR] Code:', err.code);
  console.error('[DB ERROR] Message:', err.message);
  console.error('[DB ERROR] Detail:', err.detail);
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[DB CONNECTION TEST] ❌ Failed:', err.message);
    console.error('[DB CONNECTION TEST] Code:', err.code);
    console.error('[DB CONNECTION TEST] Detail:', err.detail);
  } else {
    console.log('[DB CONNECTION TEST] ✅ Success! Connected at:', res.rows[0].now);
  }
});

module.exports = pool;
