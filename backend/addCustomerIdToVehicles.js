const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('[Migration] Adding customerid column to Render vehicledetail...');
    
    // Add customerid column if it doesn't exist
    await renderPool.query(`
      ALTER TABLE vehicledetail 
      ADD COLUMN IF NOT EXISTS customerid integer
    `);
    console.log('[Migration] ✓ customerid column added/verified');
    
    renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    renderPool.end();
  }
})();
