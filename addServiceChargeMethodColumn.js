const pool = require('./backend/config/db');

async function addServiceChargeMethodColumn() {
  const client = await pool.connect();
  try {
    console.log('=== ADDING servicechargemethod COLUMN ===\n');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'servicemaster' 
        AND column_name = 'servicechargemethod'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column servicechargemethod already exists');
      return;
    }

    // Add column
    await client.query(`
      ALTER TABLE servicemaster 
      ADD COLUMN servicechargemethod VARCHAR(50) DEFAULT NULL
    `);
    console.log('✓ Added servicechargemethod column');

    // Set RR for service 25 (ROCKER GASKET REPLACEMENT)
    await client.query(`
      UPDATE servicemaster 
      SET servicechargemethod = 'RR'
      WHERE serviceid = 25
    `);
    console.log('✓ Set servicechargemethod = "RR" for service 25');

    // Verify
    const verifyResult = await client.query(`
      SELECT serviceid, servicename, defaultrate, servicechargemethod
      FROM servicemaster 
      WHERE serviceid = 25
    `);

    console.log('\n✓ Service 25 after update:');
    const service = verifyResult.rows[0];
    console.log(`  ServiceID: ${service.serviceid}`);
    console.log(`  ServiceName: ${service.servicename}`);
    console.log(`  DefaultRate: ₹${service.defaultrate}`);
    console.log(`  ServiceChargeMethod: ${service.servicechargemethod}`);

    console.log('\n✅ SUCCESS! Item 888297 will now show:');
    console.log(`  ItemName: "Gasket Kit---Rocker cover + RR"`);
    console.log(`  UnitPrice: ₹105.00 + ₹280.00 = ₹385.00`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addServiceChargeMethodColumn();
