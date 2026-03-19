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
        'x-user-id': '1'
      }
    };

    const timeout = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, 10000);

    const req = http.request(options, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testInvoiceSaveWithSerials() {
  console.log('=== Testing Invoice Save With Serial Numbers ===\n');

  // Step 1: Create test serials
  console.log('Step 1: Creating test serial numbers...');
  const createSerialPayload = {
    itemid: 68559,  // Tyre
    quantity: 2,
    vendorid: null,
    mrp: '1500',
    manufacturingdate: '2026-02-01',
    manufacturer: 'TyreMfg',
    vendorname: 'TyreSupplier',
    batch: 'TYRE-2026-001',
    condition: 'New',
    purchaseinvoiceid: 'PO-TYRE-002',
    serialnumbers: [
      {
        serialnumber: 'TYRE-SN-' + Date.now() + '-A',
        model: 'Tyre-225/65R17',
        batch: 'TYRE-2026-001',
        manufacturingdate: '2026-02-01',
        expirydate: '2030-02-01',
        warrexpiry: '2027-02-01',
        condition: 'New'
      },
      {
        serialnumber: 'TYRE-SN-' + Date.now() + '-B',
        model: 'Tyre-225/65R17',
        batch: 'TYRE-2026-001',
        manufacturingdate: '2026-02-01',
        expirydate: '2030-02-01',
        warrexpiry: '2027-02-01',
        condition: 'New'
      }
    ]
  };

  const createResult = await makeRequest('POST', '/api/serialnumbers/batch-create-for-inventory', createSerialPayload);
  
  if (!createResult || !createResult.createdSerials || createResult.createdSerials.length < 2) {
    console.log('❌ Failed to create test serials');
    return;
  }

  const serial1Id = createResult.createdSerials[0].serialnumberid;
  const serial2Id = createResult.createdSerials[1].serialnumberid;
  
  console.log(`✅ Created 2 test serials: IDs=${serial1Id}, ${serial2Id}`);

  // Step 2: Save invoice with serial-tracked items
  console.log('\nStep 2: Saving invoice with serial numbers...');
  
  const invoicePayload = {
    BranchId: 1,
    CustomerId: 3,  // Existing customer
    VehicleId: 2,   // Existing vehicle
    VehicleNumber: 'KL01AB1234',
    JobCardId: 0,
    SubTotal: 3000,
    TotalDiscount: 0,
    PartsIncome: 3000,
    ServiceIncome: 0,
    Tax1: 0,
    Tax2: 0,
    TotalAmount: 3000,
    Technicianmain: null,
    Technicianassistant: null,
    WaterWash: null,
    ServiceAdvisorIn: null,
    ServiceAdvisorDeliver: null,
    TestDriver: null,
    Cleaner: null,
    AdditionalWork: null,
    Odometer: null,
    Notes: 'Test invoice with serials',
    Notes1: '',
    InvoiceDetails: [
      {
        ItemNumber: 'tyre',
        ItemID: 'tyre',
        Qty: 1,
        UnitPrice: 1500,
        Discount: 0,
        Total: 1500,
        source: 'item',
        serialnumberid: serial1Id  // ← Serial 1
      },
      {
        ItemNumber: 'tyre',
        ItemID: 'tyre',
        Qty: 1,
        UnitPrice: 1500,
        Discount: 0,
        Total: 1500,
        source: 'item',
        serialnumberid: serial2Id  // ← Serial 2
      }
    ],
    CreatedBy: 1
  };

  console.log('Invoice payload being sent:');
  console.log(JSON.stringify(invoicePayload, null, 2));

  const invoiceResult = await makeRequest('POST', '/api/invoices', invoicePayload);
  
  if (!invoiceResult) {
    console.log('❌ Failed to save invoice (timeout or error)');
    return;
  }

  console.log('\n✅ Invoice saved');
  console.log('Response:', JSON.stringify(invoiceResult, null, 2));

  // Step 3: Check if serials are linked
  console.log('\n\nStep 3: Verifying serial linking...\n');
  
  const serial1Check = await makeRequest('GET', `/api/serialnumbers/${serial1Id}`, null);
  const serial2Check = await makeRequest('GET', `/api/serialnumbers/${serial2Id}`, null);

  if (serial1Check) {
    console.log(`Serial 1 (ID=${serial1Id}):`);
    console.log(`  Status: ${serial1Check.status}`);
    console.log(`  InvoiceDetailID: ${serial1Check.invoicedetailid || 'NULL'}`);
    if (serial1Check.invoicedetailid) {
      console.log('  ✅ LINKED!');
    } else {
      console.log('  ❌ NOT LINKED');
    }
  }

  if (serial2Check) {
    console.log(`\nSerial 2 (ID=${serial2Id}):`);
    console.log(`  Status: ${serial2Check.status}`);
    console.log(`  InvoiceDetailID: ${serial2Check.invoicedetailid || 'NULL'}`);
    if (serial2Check.invoicedetailid) {
      console.log('  ✅ LINKED!');
    } else {
      console.log('  ❌ NOT LINKED');
    }
  }

  console.log('\n=== IMPORTANT ===');
  console.log('Check the BACKEND CONSOLE for debug logs:');
  console.log('  - [PROCESSING INVOICE DETAILS] section');
  console.log('  - InvoiceDetails array contents');
  console.log('  - Detail object with serialnumberid value');
  console.log('  - Serial linking attempt messages');
  console.log('\nThis will help identify where the issue is.');
}

testInvoiceSaveWithSerials();
