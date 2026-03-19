const pool = require('./backend/config/db');
const ItemMaster = require('./backend/models/ItemMaster');
const SerialNumber = require('./backend/models/SerialNumber');

(async () => {
  try {
    console.log('\n=== Testing batch-create with purchaseinvoiceid ===\n');

    // Simulate the request data
    const itemid = 68558;
    const quantity = 2;
    const vendorid = null;
    const mrp = '2323';
    const manufacturingdate = '';
    const manufacturer = '';
    const batch = '';
    const condition = 'New';
    const purchaseinvoiceid = 'PO-2026-001'; // NEW PARAMETER
    const createdby = 12; // User ID
    const branchid = 1; // Branch ID
    const serialnumbers = [
      { serialnumber: 'TST001', model: '', batch: '', manufacturingdate: '', expirydate: '', warrexpiry: '', condition: 'New' },
      { serialnumber: 'TST002', model: '', batch: '', manufacturingdate: '', expirydate: '', warrexpiry: '', condition: 'New' }
    ];

    console.log('1. Getting item...');
    const item = await ItemMaster.getById(itemid);
    console.log('   ✓ Item found:', item.itemname);

    if (!item.serialnumbertracking) {
      throw new Error(`Item '${item.itemname}' is not configured for serial number tracking`);
    }

    console.log('\n2. Creating serial numbers with purchaseinvoiceid...');
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
          const exists = await SerialNumber.exists(itemid, serialnumber.serialnumber.trim(), branchid);
          if (exists) {
            errors.push(`Row ${i + 1}: Serial number '${serialnumber.serialnumber}' already exists`);
            continue;
          }
        }

        // Create serial number record in SHELF status with purchaseinvoiceid
        console.log(`   Creating: ${serialnumber.serialnumber} with purchaseinvoiceid=${purchaseinvoiceid}`);
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
            purchaseinvoiceid,
            createdby,
            createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
          RETURNING serialnumberid, serialnumber, mrp, purchaseinvoiceid
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
          purchaseinvoiceid || null,
          createdby,
        ]);

        createdSerials.push({
          serialnumberid: result.rows[0].serialnumberid,
          serialnumber: result.rows[0].serialnumber,
          mrp: result.rows[0].mrp,
          purchaseinvoiceid: result.rows[0].purchaseinvoiceid
        });
        console.log(`   ✓ Created SN${result.rows[0].serialnumberid}`);
      } catch (err) {
        console.error(`   ✗ Error:`, err.message);
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    console.log('\n=== Result ===');
    console.log(`Created: ${createdSerials.length}`);
    console.log(JSON.stringify(createdSerials, null, 2));
    if (errors.length > 0) {
      console.log('\nErrors:', errors);
    }

    process.exit(0);
  } catch (e) {
    console.error('\n❌ Fatal Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
