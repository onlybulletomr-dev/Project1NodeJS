const pool = require('./backend/config/db');

async function checkItem() {
  try {
    const res = await pool.query(
      'SELECT itemid, partnumber, itemname, mrp, servicechargeid, servicechargemethod FROM itemmaster WHERE partnumber = $1',
      ['888297']
    );
    
    if (res.rows[0]) {
      console.log('\n✓ Item 888297 FOUND:');
      const item = res.rows[0];
      console.log(`  ItemID: ${item.itemid}`);
      console.log(`  PartNumber: ${item.partnumber}`);
      console.log(`  ItemName: ${item.itemname}`);
      console.log(`  MRP: ₹${item.mrp}`);
      console.log(`  ServiceChargeID: ${item.servicechargeid}`);
      console.log(`  ServiceChargeMethod: "${item.servicechargemethod}"`);
      
      if (!item.servicechargemethod) {
        console.log('\n❌ servicechargemethod is NULL or not set');
        console.log('   You need to set this value for the service charge feature to work');
      } else {
        console.log('\n✅ servicechargemethod is set correctly');
      }
    } else {
      console.log('Item 888297 not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem();
