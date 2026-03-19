const http = require('http');

const makeRequest = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/items/serial-tracking',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('\n=== API RESPONSE ===');
      console.log('Status:', res.statusCode);
      try {
        const json = JSON.parse(data);
        console.log('Data:', JSON.stringify(json, null, 2));
      } catch(e) {
        console.log('Raw response:', data);
      }
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error('\n❌ API Error:', e.message);
    if (e.code === 'ECONNREFUSED') {
      console.error('❌ Backend server is NOT running on port 5000');
      console.error('   Please start the backend with: npm start (in root or backend folder)');
    }
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Request timeout');
    process.exit(1);
  });

  req.end();
};

makeRequest();
