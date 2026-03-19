const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/services',
  method: 'GET',
  headers: {
    'x-user-id': '12'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\n=== /api/services ENDPOINT RESPONSE ===\n');
      
      if (parsed.data && Array.isArray(parsed.data)) {
        console.log(`Total services: ${parsed.data.length}\n`);
        
        // Find service 25
        const service25 = parsed.data.find(s => s.serviceid === 25);
        if (service25) {
          console.log('✓ Service 25 found:');
          console.log(JSON.stringify(service25, null, 2));
        } else {
          console.log('❌ Service 25 NOT found');
          console.log('Available services:');
          parsed.data.slice(0, 5).forEach(s => {
            console.log(`  - ID ${s.serviceid}: ${s.servicename}`);
          });
        }
      } else {
        console.log('Error: data is not an array');
        console.log('Response:', JSON.stringify(parsed, null, 2));
      }
    } catch (error) {
      console.log('Error parsing response:', error.message);
    }
  });
});

req.end();
