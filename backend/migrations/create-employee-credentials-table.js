const pool = require('../config/db');

async function createCredentialsTable() {
  try {
    console.log('Starting EmployeeCredentials table creation...');

    // Check if table already exists
    const checkTable = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'employeecredentials'`
    );

    if (checkTable.rows.length > 0) {
      console.log('✓ EmployeeCredentials table already exists');
      process.exit(0);
    }

    // Create EmployeeCredentials table
    await pool.query(`
      CREATE TABLE employeecredentials (
        credentialid SERIAL PRIMARY KEY,
        employeeid INTEGER NOT NULL,
        passwordhash VARCHAR(255),
        lastpasswordchange DATE,
        passwordattempts INTEGER DEFAULT 0,
        ispasswordexpired BOOLEAN DEFAULT false,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeid) REFERENCES employeemaster(employeeid) ON DELETE CASCADE,
        UNIQUE(employeeid)
      )
    `)

    console.log('✓ EmployeeCredentials table created successfully');

    // Create index on employeeid for faster lookups
    await pool.query(
      `CREATE INDEX idx_employeecredentials_employeeid ON employeecredentials(employeeid)`
    );

    console.log('✓ Index created on employeeid');

    // Create entries for all active employees (without passwords initially)
    const result = await pool.query(
      `SELECT employeeid FROM employeemaster WHERE isactive = true AND deletedat IS NULL`
    );

    const employeeIds = result.rows;
    let createdCount = 0;

    for (const emp of employeeIds) {
      try {
        await pool.query(
          `INSERT INTO employeecredentials (employeeid) VALUES ($1) ON CONFLICT(employeeid) DO NOTHING`,
          [emp.employeeid]
        );
        createdCount++;
      } catch (e) {
        // Skip if already exists
      }
    }

    console.log(`✓ Created credential records for ${createdCount} employees`);
    console.log('✓ EmployeeCredentials table migration completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
}

createCredentialsTable();
