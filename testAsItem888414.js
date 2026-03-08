const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/items-services/search?q=888414',
  method: 'GET',
  headers: {
    'x-user-id': '12'  // Ashok user ID
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== RESPONSE (User 12 / Ashok / Branch 3) ===');
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(`Found ${parsed.data?.length || 0} items`);
      if (parsed.data && parsed.data.length > 0) {
        const item = parsed.data.find(item => item.itemnumber === '888414');
        if (item) {
          console.log('\n✓ FOUND 888414:');
          console.log(JSON.stringify(item, null, 2));
        } else {
          console.log('\n✗ 888414 NOT in results');
          console.log('All items found:');
          parsed.data.forEach(item => {
            console.log(`  - ${item.itemnumber}: ${item.itemdescription}`);
          });
        }
      }
    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  process.exit(1);
});

req.end();
