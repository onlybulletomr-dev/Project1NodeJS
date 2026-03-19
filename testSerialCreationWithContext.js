const http = require('http');

function makeRequest(method, path, body) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'  // User ID 1 (Murali, Branch 2)
      }
    };

    const timeout = setTimeout(() => {
      console.log(`[TIMEOUT] Request to ${path} timed out after 5 seconds`);
      req.destroy();
      resolve(null);
    }, 5000);

    const req = http.request(options, (res) => {
      clearTimeout(timeout);
      console.log(`[RESPONSE] ${method} ${path} - Status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          console.log('Error parsing response:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      clearTimeout(timeout);
      console.log('Request error:', e.message);
      resolve(null);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testSerialCreation() {
  console.log('=== Testing Serial Number Creation With User Context ===\n');

  // Step 1: Create a test serial number
  console.log('Step 1: Create a test serial number via batch-create-for-inventory');
  const createPayload = {
    itemid: 68559,  // Tyre
    quantity: 1,
    vendorid: null,
    mrp: '500',
    manufacturingdate: '2026-01-01',
    manufacturer: 'TestMfg',
    vendorname: 'TestVendor',
    batch: 'BATCH-001',
    condition: 'New',
    purchaseinvoiceid: 'PO-TEST-001',
    serialnumbers: [
      {
        serialnumber: 'TEST-SN-' + Date.now(),
        model: 'TestModel',
        batch: 'BATCH-001',
        manufacturingdate: '2026-01-01',
        expirydate: '2027-01-01',
        warrexpiry: '2027-01-01',
        condition: 'New'
      }
    ]
  };

  const createResult = await makeRequest('POST', '/api/serialnumbers/batch-create-for-inventory', createPayload);
  
  if (!createResult || !createResult.createdSerials || createResult.createdSerials.length === 0) {
    console.log('❌ Failed to create serial:', createResult);
    return;
  }

  const serialId = createResult.createdSerials[0].serialnumberid;
  const serialNumber = createResult.createdSerials[0].serialnumber;
  console.log('✅ Serial created:', { serialId, serialNumber });

  // Step 2: Fetch the created serial and check createdby and branchid
  console.log('\nStep 2: Fetch the created serial to verify createdby and branchid');
  const fetchResult = await makeRequest('GET', `/api/serialnumbers/${serialId}`, null);

  if (!fetchResult) {
    console.log('❌ Failed to fetch serial');
    return;
  }

  console.log('Serial record details:');
  console.log('  serialnumberid:', fetchResult.serialnumberid);
  console.log('  serialnumber:', fetchResult.serialnumber);
  console.log('  branchid:', fetchResult.branchid);
  console.log('  createdby:', fetchResult.createdby);
  console.log('  createdat:', fetchResult.createdat);

  // Verify the fields are populated
  console.log('\n=== Verification ===');
  
  if (!fetchResult.branchid || fetchResult.branchid === null) {
    console.log('❌ branchid is NOT populated (value:', fetchResult.branchid + ')');
  } else if (fetchResult.branchid === 2) {
    console.log('✅ branchid correctly set to 2 (user branch)');
  } else {
    console.log('⚠️  branchid is populated but unexpected value:', fetchResult.branchid);
  }

  if (!fetchResult.createdby || fetchResult.createdby === null) {
    console.log('❌ createdby is NOT populated (value:', fetchResult.createdby + ')');
  } else if (fetchResult.createdby === 1) {
    console.log('✅ createdby correctly set to 1 (employee id for Murali)');
  } else {
    console.log('⚠️  createdby is populated but unexpected value:', fetchResult.createdby);
  }

  console.log('\n=== Summary ===');
  const branchIdOk = fetchResult.branchid === 2;
  const createdByOk = fetchResult.createdby === 1;
  
  if (branchIdOk && createdByOk) {
    console.log('✅ All fields properly populated! Serial creation is working correctly.');
  } else {
    console.log('❌ Some fields are not properly populated. Fix needed.');
  }
}

testSerialCreation();
