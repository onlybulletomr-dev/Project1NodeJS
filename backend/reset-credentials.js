const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetCredentialsTable() {
  try {
    console.log('[RESET] Dropping employeecredentials table if it exists...');
    
    // Drop the table
    await pool.query('DROP TABLE IF EXISTS employeecredentials CASCADE');
    console.log('[RESET] ✓ Table dropped');
    
    // Recreate the table with correct structure
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
    console.log('[RESET] ✓ EmployeeCredentials table recreated');

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employeecredentials_employeeid 
      ON employeecredentials(employeeid);
    `);
    console.log('[RESET] ✓ Index created');

    // Get employees without credentials
    const employeesQuery = `
      SELECT em.employeeid, em.firstname 
      FROM employeemaster em
      LEFT JOIN employeecredentials ec ON em.employeeid = ec.employeeid
      WHERE ec.credentialid IS NULL
      AND em.deletedat IS NULL;
    `;

    const employeesResult = await pool.query(employeesQuery);
    console.log(`[RESET] Found ${employeesResult.rows.length} employees without credentials`);

    if (employeesResult.rows.length > 0) {
      const defaultPassword = 'Default@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      for (const employee of employeesResult.rows) {
        await pool.query(`
          INSERT INTO employeecredentials (employeeid, passwordhash)
          VALUES ($1, $2)
          ON CONFLICT (employeeid) DO NOTHING;
        `, [employee.employeeid, hashedPassword]);
        console.log(`[RESET] ✓ Created credentials for ${employee.firstname}`);
      }
    }

    console.log('[RESET] ✅ EmployeeCredentials reset complete');
    process.exit(0);

  } catch (error) {
    console.error('[RESET] Error:', error.message);
    console.error('[RESET] Stack:', error.stack);
    process.exit(1);
  }
}

resetCredentialsTable();
