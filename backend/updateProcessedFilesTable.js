const pool = require('./config/db');

async function updateTable() {
  try {
    // Drop the old table if it exists
    await pool.query(`DROP TABLE IF EXISTS processed_files`);
    
    // Create new table with billNo as unique identifier
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_files (
        id SERIAL PRIMARY KEY,
        billno VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255),
        branchid INTEGER,
        processedat TIMESTAMP DEFAULT NOW(),
        userid INTEGER,
        deletedat TIMESTAMP
      )
    `);
    console.log('✓ processed_files table recreated with billno');
    process.exit(0);
  } catch (error) {
    console.error('Error updating table:', error.message);
    process.exit(1);
  }
}

updateTable();
