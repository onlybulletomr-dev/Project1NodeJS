const pool = require('../config/db');

async function addPasswordField() {
  try {
    console.log('Starting password field migration...');

    // Check if password column already exists
    const checkColumn = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'employeemaster' AND column_name = 'password'`
    );

    if (checkColumn.rows.length > 0) {
      console.log('✓ Password column already exists');
      process.exit(0);
    }

    // Add password column
    const addColumn = await pool.query(
      `ALTER TABLE employeemaster ADD COLUMN password VARCHAR(255)`
    );

    console.log('✓ Password column added successfully');

    // Get count of employees
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM employeemaster WHERE isactive = true`
    );

    console.log(`✓ Total active employees: ${countResult.rows[0].count}`);
    console.log('✓ Password field migration completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
}

addPasswordField();
