const pool = require('./backend/config/db');
const ItemMaster = require('./backend/models/ItemMaster');
const SerialNumber = require('./backend/models/SerialNumber');

(async () => {
  try {
    console.log('\n=== Testing batch-create-for-inventory logic ===\n');

    // Simulate the request data
    const itemid = 68558;
    const quantity = 3;
    const vendorid = null;
    const mrp = '2345';
    const manufacturingdate = '';
    const manufacturer = '';
    const batch = '';
    const condition = 'New';
    const createdby = 12; // User ID
    const branchid = 1; // Branch ID
    const serialnumbers = [
      { serialnumber: 'SN001', model: '', batch: '', manufacturingdate: '', expirydate: '', warrexpiry: '', condition: 'New' },
      { serialnumber: 'SN002', model: '', batch: '', manufacturingdate: '', expirydate: '', warrexpiry: '', condition: 'New' },
      { serialnumber: 'SN003', model: '', batch: '', manufacturingdate: '', expirydate: '', warrexpiry: '', condition: 'New' }
    ];

    console.log('1. Getting item...');
    const item = await ItemMaster.getById(itemid);
    console.log('   Item:', item);

    if (!item) {
      throw new Error('Item not found');
    }

    if (!item.serialnumbertracking) {
      throw new Error(`Item '${item.itemname}' is not configured for serial number tracking`);
    }

    console.log('\n2. Checking serial numbers...');
    const createdSerials = [];
    const errors = [];

    for (let i = 0; i < serialnumbers.length; i++) {
      const serialnumber = serialnumbers[i];

      // Validate serial number
      if (!serialnumber.serialnumber || !serialnumber.serialnumber.trim()) {
        errors.push(`Row ${i + 1}: Serial number cannot be empty`);
        continue;
      }

      try {
        // Check for duplicates if not allowed
        if (!item.duplicateserialnumber) {
          console.log(`   Checking if ${serialnumber.serialnumber} exists...`);
          const exists = await SerialNumber.exists(itemid, serialnumber.serialnumber.trim(), branchid);
          if (exists) {
            errors.push(`Row ${i + 1}: Serial number '${serialnumber.serialnumber}' already exists`);
            continue;
          }
        }

        // Create serial number record in SHELF status
        console.log(`   Creating serial: ${serialnumber.serialnumber}`);
        const result = await pool.query(`
          INSERT INTO serialnumber (
            itemid,
            serialnumber,
            model,
            batch,
            manufacturingdate,
            expirydate,
            warrexpiry,
            condition,
            branchid,
            vendorid,
            mrp,
            status,
            remarks,
            createdby,
            createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
          RETURNING serialnumberid, serialnumber, mrp
        `, [
          itemid,
          serialnumber.serialnumber.trim(),
          serialnumber.model || null,
          serialnumber.batch || null,
          serialnumber.manufacturingdate || null,
          serialnumber.expirydate || null,
          serialnumber.warrexpiry || null,
          serialnumber.condition || 'New',
          branchid,
          vendorid || null,
          mrp || null,
          'SHELF',
          manufacturer ? `Mfr: ${manufacturer}` : null,
          createdby,
        ]);

        createdSerials.push({
          serialnumberid: result.rows[0].serialnumberid,
          serialnumber: result.rows[0].serialnumber,
          mrp: result.rows[0].mrp,
        });
      } catch (err) {
        console.error(`   Error creating serial number:`, err.message);
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    console.log('\n=== Result ===');
    console.log(`Created: ${createdSerials.length}`);
    console.log('Serials:', JSON.stringify(createdSerials, null, 2));
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    process.exit(0);
  } catch (e) {
    console.error('\n❌ Fatal Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
