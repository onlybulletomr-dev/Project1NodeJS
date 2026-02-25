const https = require('https');

console.log('Testing Render vehicle endpoints...\n');

// Test 1: Get unique models
console.log('1. Testing /api/vehicles/unique/models');
const options1 = {
  hostname: 'project1-backend1.onrender.com',
  path: '/api/vehicles/unique/models',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req1 = https.request(options1, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(`   Response: ${parsed.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Data: ${parsed.data ? parsed.data.length + ' models' : 'empty'}`);
      if (parsed.data && parsed.data.length > 0) {
        console.log(`   Sample models:`, parsed.data.slice(0, 3));
      }
    } catch (e) {
      console.log(`   Error parsing response: ${e.message}`);
      console.log(`   Raw response:`, data.substring(0, 200));
    }
    testColors();
  });
});

req1.on('error', (e) => {
  console.error(`   Error: ${e.message}`);
  testColors();
});

req1.end();

// Test 2: Get unique colors for a model
function testColors() {
  console.log('\n2. Testing /api/vehicles/unique/colors?model=Classic%20350%20Reborn');
  const options2 = {
    hostname: 'project1-backend1.onrender.com',
    path: '/api/vehicles/unique/colors?model=Classic%20350%20Reborn',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req2 = https.request(options2, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`   Response: ${parsed.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Data: ${parsed.data ? parsed.data.length + ' colors' : 'empty'}`);
        if (parsed.data && parsed.data.length > 0) {
          console.log(`   Colors:`, parsed.data);
        }
      } catch (e) {
        console.log(`   Error parsing response: ${e.message}`);
        console.log(`   Raw response:`, data.substring(0, 200));
      }
      console.log('\n✅ Test complete');
    });
  });

  req2.on('error', (e) => {
    console.error(`   Error: ${e.message}`);
    console.log('\n✅ Test complete');
  });

  req2.end();
}
