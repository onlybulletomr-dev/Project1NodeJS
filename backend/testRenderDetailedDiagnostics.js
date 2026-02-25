const https = require('https');

console.log('Detailed Render Vehicle Endpoints Test\n');

const testEndpoint = (path, description) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'project1-backend1.onrender.com',
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`\n${description}`);
        console.log(`Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Raw response:', data.substring(0, 500));
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`\n${description}`);
      console.log(`Error: ${e.message}`);
      resolve();
    });

    req.end();
  });
};

async function runTests() {
  await testEndpoint('/api/vehicles/unique/models', '1️⃣  GET /api/vehicles/unique/models');
  await testEndpoint('/api/vehicles/unique/colors?model=Classic%20350%20Reborn', '2️⃣  GET /api/vehicles/unique/colors?model=Classic%20350%20Reborn');
  await testEndpoint('/api/customer/50/vehicle-details', '3️⃣  GET /api/customer/50/vehicle-details (for comparison)');
  console.log('\n✅ Tests complete');
}

runTests();
