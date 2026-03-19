const axios = require('axios');

async function testSerialCreate() {
  try {
    console.log('Testing batch-create-for-inventory endpoint...');
    
    const payload = {
      itemid: 68558,
      quantity: 2,
      vendorid: null,
      mrp: '2333',
      manufacturingdate: '',
      manufacturer: 'Test Manufacturer',
      vendorname: 'Test Vendor',
      batch: '',
      condition: 'New',
      purchaseinvoiceid: 'PO-2026-001',
      serialnumbers: [
        {
          serialnumber: 'SN001',
          model: '',
          batch: '',
          manufacturingdate: '2026-03-15',
          expirydate: '2026-03-15',
          warrexpiry: '2026-03-15',
          condition: 'New'
        },
        {
          serialnumber: 'SN002',
          model: '',
          batch: '',
          manufacturingdate: '2026-03-15',
          expirydate: '2026-03-15',
          warrexpiry: '2026-03-15',
          condition: 'New'
        }
      ]
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      'http://localhost:5000/api/serialnumbers/batch-create-for-inventory',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      }
    );

    console.log('Success!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

testSerialCreate();
