/**
 * Migration: Add employees created on March 18, 2026
 * This adds the new employee record to the database
 */

const pool = require('../config/db');

async function up() {
  try {
    console.log('[MIGRATION] Adding new employee from March 18, 2026...');

    // Add the new employee created today
    const insertQuery = `
      INSERT INTO employeemaster (
        employeeid, branchid, firstname, lastname, employeetype, 
        role, isactive, dateofjoining, createdby, createdat, 
        updatedby, updatedat, role_type
      ) VALUES (
        15, 2, 'Shanmugam', 'Ramanathan', 'Employee',
        true, true, '2026-02-25T18:30:00Z', 1, '2026-03-17T18:30:00Z',
        12, '2026-03-17T18:30:00Z', 'Employee'
      )
      ON CONFLICT (employeeid) DO NOTHING;
    `;

    const result = await pool.query(insertQuery);
    console.log(`✅ Migration completed. Rows affected: ${result.rowCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function down() {
  try {
    console.log('[MIGRATION] Reverting employee addition...');
    
    const deleteQuery = `
      DELETE FROM employeemaster WHERE employeeid = 15;
    `;

    const result = await pool.query(deleteQuery);
    console.log(`✅ Rollback completed. Rows affected: ${result.rowCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

// Export for use in migration runner
module.exports = { up, down };

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('\n✅ All migrations completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Migration failed:', err);
      process.exit(1);
    });
}
