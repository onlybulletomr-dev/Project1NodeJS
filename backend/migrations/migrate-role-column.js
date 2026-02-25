const pool = require('../config/db');

async function migrateRoleColumn() {
  try {
    console.log('\n=== Migrating Role Column (boolean → varchar) ===\n');
    
    // Step 1: Add new column
    console.log('Step 1: Adding new role_type column...');
    await pool.query(`
      ALTER TABLE employeemaster 
      ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) DEFAULT 'Employee'
    `);
    console.log('✓ role_type column added\n');
    
    // Step 2: Migrate data
    console.log('Step 2: Migrating data from role boolean to role_type varchar...');
    await pool.query(`
      UPDATE employeemaster 
      SET role_type = CASE 
        WHEN role = true THEN 'Admin'
        ELSE 'Employee'
      END
      WHERE role_type IS NULL OR role_type = 'Employee'
    `);
    const updateRes = await pool.query('SELECT COUNT(*) FROM employeemaster WHERE role_type IS NOT NULL');
    console.log(`✓ Migrated ${updateRes.rows[0].count} records\n`);
    
    // Step 3: Verify
    console.log('Step 3: Verifying migration...');
    const verifyRes = await pool.query(`
      SELECT role_type, COUNT(*) as count 
      FROM employeemaster 
      GROUP BY role_type
    `);
    console.log('Data after migration:');
    verifyRes.rows.forEach(row => {
      console.log(`  ${row.role_type}: ${row.count} employees`);
    });
    
    console.log('\n✓ Migration complete!');
    console.log('\nRole types available: Admin, Manager, Employee');
    
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrateRoleColumn();
