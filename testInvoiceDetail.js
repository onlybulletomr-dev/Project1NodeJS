const http = require('http');

// Test API endpoint to get invoice details
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/invoices/62',
  method: 'GET',
  headers: {
    'x-user-id': '1'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('\nFull Response:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw response:', data.substring(0, 1000));
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.end();
