const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function ensureCredentialsTableExists() {
  try {
    console.log('[INIT] Ensuring employeecredentials table exists...');

    // Create table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS employeecredentials (
        credentialid SERIAL PRIMARY KEY,
        employeeid INTEGER NOT NULL UNIQUE REFERENCES employeemaster(employeeid) ON DELETE CASCADE,
        passwordhash VARCHAR(255) NOT NULL,
        lastpasswordchange DATE DEFAULT CURRENT_DATE,
        passwordattempts INTEGER DEFAULT 0,
        ispasswordexpired BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('[INIT] ✓ EmployeeCredentials table exists');

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employeecredentials_employeeid 
      ON employeecredentials(employeeid);
    `);
    console.log('[INIT] ✓ Index created');

    // Get employees without credentials
    const employeesQuery = `
      SELECT em.employeeid, em.firstname 
      FROM employeemaster em
      LEFT JOIN employeecredentials ec ON em.employeeid = ec.employeeid
      WHERE ec.credentialid IS NULL
      AND em.deletedat IS NULL;
    `;

    const employeesResult = await pool.query(employeesQuery);
    console.log(`[INIT] Found ${employeesResult.rows.length} employees without credentials`);

    if (employeesResult.rows.length > 0) {
      const defaultPassword = 'Default@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      for (const employee of employeesResult.rows) {
        await pool.query(`
          INSERT INTO employeecredentials (employeeid, passwordhash)
          VALUES ($1, $2)
          ON CONFLICT (employeeid) DO NOTHING;
        `, [employee.employeeid, hashedPassword]);
        console.log(`[INIT] ✓ Created credentials for ${employee.firstname}`);
      }
    }

    console.log('[INIT] ✅ EmployeeCredentials initialization complete');
    return true;

  } catch (error) {
    console.error('[INIT] Error:', error.message);
    console.error('[INIT] Stack:', error.stack);
    throw error;
  }
}

module.exports = { ensureCredentialsTableExists };
