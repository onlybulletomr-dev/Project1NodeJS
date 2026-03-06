const pool = require('./config/db');

async function createProcessedFilesTable() {
  const client = await pool.connect();
  try {
    console.log('Creating processedfiles table...');

    // Drop existing tables if they exist
    await client.query('DROP TABLE IF EXISTS processedfiles CASCADE');
    await client.query('DROP TABLE IF EXISTS processed_files CASCADE');

    // Create the processedfiles table with all standard fields
    const createTableQuery = `
      CREATE TABLE processedfiles (
        id SERIAL PRIMARY KEY,
        billno VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(500),
        branchid INTEGER,
        createdby INTEGER,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedby INTEGER,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletedby INTEGER,
        deletedat TIMESTAMP
      )
    `;

    await client.query(createTableQuery);
    console.log('✓ processedfiles table created successfully');

    // Create index on billno for faster lookups
    await client.query(`
      CREATE INDEX idx_processedfiles_billno ON processedfiles(billno) 
      WHERE deletedat IS NULL
    `);
    console.log('✓ Index created on billno');

  } catch (error) {
    console.error('Error creating table:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

createProcessedFilesTable();
