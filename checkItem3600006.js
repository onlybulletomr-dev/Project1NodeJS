const pool = require('./backend/config/db');

async function checkItem3600006() {
  try {
    console.log('=== CHECKING ITEM 3600006 ===\n');

    // Get item 3600006
    const itemResult = await pool.query(`
      SELECT itemid, partnumber, itemname, mrp, servicechargeid, servicechargemethod
      FROM itemmaster
      WHERE partnumber = '3600006'
      LIMIT 1
    `);

    if (itemResult.rows.length === 0) {
      console.log('❌ Item 3600006 NOT FOUND in itemmaster');
      await pool.end();
      return;
    }

    const item = itemResult.rows[0];
    console.log('✓ Item Found:');
    console.log(`  ItemID: ${item.itemid}`);
    console.log(`  PartNumber: ${item.partnumber}`);
    console.log(`  ItemName: ${item.itemname}`);
    console.log(`  MRP: ₹${item.mrp}`);
    console.log(`  ServiceChargeID: ${item.servicechargeid}`);
    console.log(`  ServiceChargeMethod: "${item.servicechargemethod}"`);

    // Check if servicechargemethod is set
    if (!item.servicechargemethod) {
      console.log('\n❌ PROBLEM: servicechargemethod is NULL');
      console.log('This item needs servicechargemethod = "RR" set in database');
    } else {
      console.log(`\n✓ servicechargemethod is set to "${item.servicechargemethod}"`);
      
      // If servicechargeid is set, get the service details
      if (item.servicechargeid && item.servicechargeid > 0) {
        const serviceResult = await pool.query(`
          SELECT serviceid, servicenumber, servicename, defaultrate
          FROM servicemaster
          WHERE serviceid = $1
        `, [item.servicechargeid]);

        if (serviceResult.rows.length > 0) {
          const service = serviceResult.rows[0];
          console.log('\n✓ Service Found:');
          console.log(`  ServiceID: ${service.serviceid}`);
          console.log(`  ServiceName: ${service.servicename}`);
          console.log(`  DefaultRate: ₹${service.defaultrate}`);
          console.log(`\n✅ EXPECTED RESULT:\n  ItemName: "${item.itemname} + ${item.servicechargemethod}"\n  UnitPrice: ₹${Number(item.mrp) + Number(service.defaultrate)}`);
        } else {
          console.log(`\n❌ Service with ID ${item.servicechargeid} NOT FOUND`);
        }
      } else {
        console.log(`\n❌ PROBLEM: servicechargeid is NOT set (value: ${item.servicechargeid})`);
        console.log('This item needs servicechargeid to point to a service');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem3600006();
