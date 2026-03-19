const pool = require('./backend/config/db');

async function alterLogoimagepathColumn() {
  try {
    console.log('🔧 Altering logoimagepath column type...\n');
    
    // Alter the column to TEXT type
    const result = await pool.query(
      `ALTER TABLE companymaster 
       ALTER COLUMN logoimagepath TYPE TEXT`
    );

    console.log('✅ Column type changed successfully!');
    console.log('   logoimagepath: VARCHAR(255) → TEXT');
    console.log('\n📊 Now you can store Base64 images of any size.\n');

    // Verify the change
    const verify = await pool.query(
      `SELECT column_name, data_type, character_maximum_length 
       FROM information_schema.columns 
       WHERE table_name = 'companymaster' AND column_name = 'logoimagepath'`
    );

    if (verify.rows.length > 0) {
      const col = verify.rows[0];
      console.log('📋 Verification:');
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Max length: ${col.character_maximum_length || 'unlimited'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

alterLogoimagepathColumn();
