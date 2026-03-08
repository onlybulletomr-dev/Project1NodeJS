const http = require('http');

// Test API endpoint to get all invoices
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/invoices',
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
    try {
      const jsonData = JSON.parse(data);
      const invoices = jsonData.data || [];
      console.log(`Total invoices: ${invoices.length}`);
      
      if (invoices.length > 0) {
        console.log('\nFirst invoice:');
        console.log(JSON.stringify(invoices[0], null, 2));
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.end();
