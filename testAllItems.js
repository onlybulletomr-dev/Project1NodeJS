const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/items-services/search?q=',
  method: 'GET',
  headers: {
    'x-user-id': '1'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== RESPONSE ===');
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(`Found ${parsed.data?.length || 0} items/services`);
      if (parsed.data && parsed.data.length > 0) {
        console.log('\nFirst 5 items:');
        parsed.data.slice(0, 5).forEach((item, idx) => {
          console.log(`${idx + 1}. ${item.itemnumber} - ${item.itemdescription} (Qty: ${item.availableqty})`);
        });
        
        // Check if 888414 is in the list
        const found888414 = parsed.data.find(item => item.itemnumber === '888414');
        if (found888414) {
          console.log('\n✓ FOUND 888414:', found888414);
        } else {
          console.log('\n✗ 888414 NOT found in results');
        }
      }
    } catch (e) {
      console.log('Raw body:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  process.exit(1);
});

req.end();
