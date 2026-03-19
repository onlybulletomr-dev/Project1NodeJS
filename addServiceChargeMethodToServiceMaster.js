const pool = require('./backend/config/db');

async function addServiceChargeMethodToServiceMaster() {
  const client = await pool.connect();
  try {
    console.log('=== ADDING servicechargemethod TO servicemaster ===\n');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'servicemaster' 
        AND column_name = 'servicechargemethod'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column servicechargemethod already exists in servicemaster');
    } else {
      // Add column
      await client.query(`
        ALTER TABLE servicemaster 
        ADD COLUMN servicechargemethod VARCHAR(50) DEFAULT NULL
      `);
      console.log('✓ Added servicechargemethod column to servicemaster');
    }

    // Verify the column exists
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'servicemaster' 
        AND column_name = 'servicechargemethod'
    `);

    if (verifyResult.rows.length > 0) {
      console.log(`✓ Column verified: ${verifyResult.rows[0].column_name} (${verifyResult.rows[0].data_type})`);
    }

    console.log('\n✅ SUCCESS! servicemaster table is ready');

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addServiceChargeMethodToServiceMaster();
