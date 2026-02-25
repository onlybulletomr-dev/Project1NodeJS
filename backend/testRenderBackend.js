const https = require('https');

const options = {
  hostname: 'project1-backend1.onrender.com',
  path: '/api/customer/50/vehicle-details',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('CORS Headers:');
  console.log('  Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
  console.log('  Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
  console.log('  Access-Control-Allow-Headers:', res.headers['access-control-allow-headers']);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Response: Success' + (parsed.data ? ' - ' + parsed.data.length + ' items' : ''));
    } catch (e) {
      console.log('Response body:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
console.log('Testing Render backend...');
