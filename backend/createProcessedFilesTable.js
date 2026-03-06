const pool = require('./config/db');

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_files (
        id SERIAL PRIMARY KEY,
        file_hash VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255),
        branchid INTEGER,
        processedat TIMESTAMP DEFAULT NOW(),
        userid INTEGER,
        deletedat TIMESTAMP
      )
    `);
    console.log('✓ processed_files table created');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error.message);
    process.exit(1);
  }
}

createTable();
