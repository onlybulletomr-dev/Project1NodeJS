const pool = require('./backend/config/db');

async function checkItem888297() {
  try {
    console.log('=== CHECKING ITEM 888297 SERVICE CHARGE ===\n');

    // Get item 888297
    const itemResult = await pool.query(`
      SELECT itemid, partnumber, itemname, mrp, servicechargeid
      FROM itemmaster
      WHERE partnumber = '888297'
      LIMIT 1
    `);

    if (itemResult.rows.length === 0) {
      console.log('Item 888297 NOT FOUND in itemmaster');
      await pool.end();
      return;
    }

    const item = itemResult.rows[0];
    console.log('✓ Item Found:');
    console.log(`  ItemID: ${item.itemid}`);
    console.log(`  PartNumber: ${item.partnumber}`);
    console.log(`  ItemName: ${item.itemname || item.description}`);
    console.log(`  MRP: ₹${item.mrp}`);
    console.log(`  ServiceChargeID: ${item.servicechargeid}`);

    // If servicechargeid is set, get the service details
    if (item.servicechargeid && item.servicechargeid > 0) {
      const serviceResult = await pool.query(`
        SELECT serviceid, servicenumber, servicename, description, defaultrate, servicechargemethod
        FROM servicemaster
        WHERE serviceid = $1
      `, [item.servicechargeid]);

      if (serviceResult.rows.length > 0) {
        const service = serviceResult.rows[0];
        console.log('\n✓ Service Found:');
        console.log(`  ServiceID: ${service.serviceid}`);
        console.log(`  ServiceNumber: ${service.servicenumber}`);
        console.log(`  ServiceName: ${service.servicename}`);
        console.log(`  DefaultRate: ₹${service.defaultrate}`);
        console.log(`  ServiceChargeMethod: ${service.servicechargemethod}`);
        console.log(`\n✅ EXPECTED RESULT:`)
        console.log(`  ItemName should display: "${item.itemname} + ${service.servicechargemethod}"`);
        console.log(`  UnitPrice should be: ₹${item.mrp} + ₹${service.defaultrate} = ₹${item.mrp + service.defaultrate}`);
      } else {
        console.log(`\n❌ Service with ID ${item.servicechargeid} NOT FOUND`);
      }
    } else {
      console.log(`\n⚠️  Item has NO servicechargeid set (value: ${item.servicechargeid})`);
      console.log('You need to set servicechargeid for this item to enable service charges');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem888297();
