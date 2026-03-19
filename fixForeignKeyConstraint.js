const pool = require('./backend/config/db');

async function fixForeignKeyConstraint() {
  try {
    console.log('=== Fixing Foreign Key Constraint ===\n');
    
    // Step 1: Drop the old foreign key constraint
    console.log('Step 1: Dropping old foreign key constraint...');
    await pool.query(`
      ALTER TABLE serialnumber 
      DROP CONSTRAINT serialnumber_invoiceid_itemid_fkey
    `);
    console.log('✅ Old constraint dropped\n');
    
    // Step 2: Create new foreign key that references invoicedetailid only
    console.log('Step 2: Creating new foreign key constraint on invoicedetailid...');
    await pool.query(`
      ALTER TABLE serialnumber 
      ADD CONSTRAINT serialnumber_invoicedetailid_fkey 
      FOREIGN KEY (invoicedetailid) 
      REFERENCES invoicedetail(invoicedetailid)
    `);
    console.log('✅ New constraint created\n');
    
    // Verify
    console.log('Step 3: Verifying constraints...');
    const result = await pool.query(`
      SELECT
        constraint_name,
        column_name
      FROM information_schema.key_column_usage
      JOIN information_schema.table_constraints USING (constraint_name, constraint_schema, table_name)
      WHERE table_name = 'serialnumber' AND constraint_type = 'FOREIGN KEY'
      ORDER BY constraint_name
    `);
    
    console.log('✅ Foreign Key Constraints:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixForeignKeyConstraint();
