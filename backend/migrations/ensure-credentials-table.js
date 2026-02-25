const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function ensureCredentialsTable() {
  try {
    console.log('[MIGRATION] Ensuring EmployeeCredentials table exists...');

    // Create table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS employeecredentials (
        credentialid SERIAL PRIMARY KEY,
        employeeid INTEGER NOT NULL REFERENCES employeemaster(employeeid) ON DELETE CASCADE,
        passwordhash VARCHAR(255) NOT NULL,
        lastpasswordchange DATE DEFAULT CURRENT_DATE,
        passwordattempts INTEGER DEFAULT 0,
        ispasswordexpired BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employeeid)
      );
    `;

    await pool.query(createTableQuery);
    console.log('[MIGRATION] ✓ Table created or already exists');

    // Create index if it doesn't exist
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_employeecredentials_employeeid 
      ON employeecredentials(employeeid);
    `;

    await pool.query(createIndexQuery);
    console.log('[MIGRATION] ✓ Index created or already exists');

    // Get all employees without credentials
    const employeesQuery = `
      SELECT em.EmployeeID, em.FirstName 
      FROM EmployeeMaster em
      LEFT JOIN employeecredentials ec ON em.EmployeeID = ec.employeeid
      WHERE ec.credentialid IS NULL
      AND em.DeletedAt IS NULL;
    `;

    const result = await pool.query(employeesQuery);
    console.log(`[MIGRATION] Found ${result.rows.length} employees without credentials`);

    // Default password: "Default@123"
    const defaultPassword = 'Default@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (const employee of result.rows) {
      const insertQuery = `
        INSERT INTO employeecredentials (employeeid, passwordhash)
        VALUES ($1, $2)
        ON CONFLICT (employeeid) DO NOTHING;
      `;

      await pool.query(insertQuery, [employee.employeeid, hashedPassword]);
      console.log(`[MIGRATION] ✓ Created default credentials for ${employee.firstname} (ID: ${employee.employeeid})`);
    }

    console.log('[MIGRATION] ✓ EmployeeCredentials table migration complete');
    process.exit(0);

  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    console.error('[MIGRATION] Stack:', error.stack);
    process.exit(1);
  }
}

ensureCredentialsTable();
