const pool = require('../config/db');

async function alterLogoimagepathColumn() {
  try {
    console.log('🔧 Migration: Altering logoimagepath column to TEXT...\n');
    
    // Check current column definition
    const checkResult = await pool.query(
      `SELECT column_name, data_type, character_maximum_length 
       FROM information_schema.columns 
       WHERE table_name = 'companymaster' AND column_name = 'logoimagepath'`
    );

    if (checkResult.rows.length === 0) {
      console.log('⚠️  Column logoimagepath not found in companymaster table');
      return;
    }

    const currentColumn = checkResult.rows[0];
    console.log('📋 Current column definition:');
    console.log(`   Name: ${currentColumn.column_name}`);
    console.log(`   Type: ${currentColumn.data_type}`);
    console.log(`   Max length: ${currentColumn.character_maximum_length || 'unlimited'}\n`);

    // Check if already TEXT
    if (currentColumn.data_type === 'text') {
      console.log('✅ Column is already TEXT type. No migration needed.');
      return;
    }

    // Alter the column to TEXT type to support large base64 logos
    console.log('Running ALTER TABLE...');
    await pool.query(
      `ALTER TABLE companymaster 
       ALTER COLUMN logoimagepath TYPE TEXT`
    );

    console.log('✅ Column type changed successfully!');
    console.log('   logoimagepath: VARCHAR(255) → TEXT\n');

    // Verify the change
    const verify = await pool.query(
      `SELECT column_name, data_type, character_maximum_length 
       FROM information_schema.columns 
       WHERE table_name = 'companymaster' AND column_name = 'logoimagepath'`
    );

    if (verify.rows.length > 0) {
      const col = verify.rows[0];
      console.log('📋 Verification successful:');
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Max length: ${col.character_maximum_length || 'unlimited'}`);
      console.log('\n✅ Migration completed successfully!');
      console.log('   Now you can store Base64 images of any size.\n');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    throw error;
  }
}

// Run migration
if (require.main === module) {
  alterLogoimagepathColumn()
    .then(() => {
      console.log('✅ Exiting migration script');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Exiting with error');
      process.exit(1);
    });
}

module.exports = { alterLogoimagepathColumn };
