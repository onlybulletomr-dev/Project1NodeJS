const https = require('https');

function testAPI(url, description) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const startTime = Date.now();
    
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Time: ${elapsed}ms`);
        
        try {
          const json = JSON.parse(data);
          if (json.success) {
            if (Array.isArray(json.data)) {
              console.log(`   ✅ Success - ${json.data.length} items returned`);
              if (json.data.length > 0) {
                console.log(`   Sample:`, JSON.stringify(json.data[0], null, 2).split('\n').slice(0, 5).join('\n'));
              }
            } else {
              console.log(`   ✅ Success`);
              console.log(`   Data:`, JSON.stringify(json.data).substring(0, 100));
            }
          } else {
            console.log(`   ⚠️  Response: ${json.message || 'Unknown error'}`);
          }
        } catch (e) {
          console.log(`   ❌ Invalid JSON response`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       RENDER API ENDPOINT TESTS                    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  
  const tests = [
    ['https://project1-backend1.onrender.com/api/customer/50/vehicle-details', 'Customer 50 (Ashok) Vehicles - 2 vehicles expected'],
    ['https://project1-backend1.onrender.com/api/customer/51/vehicle-details', 'Customer 51 (Anand) Vehicles - 2 vehicles expected'],
    ['https://project1-backend1.onrender.com/api/customer/52/vehicle-details', 'Customer 52 (Adhiban) Vehicles - 1 vehicle expected'],
    ['https://project1-backend1.onrender.com/api/invoice/list', 'Invoice List'],
    ['https://project1-backend1.onrender.com/api/payment/list', 'Payment List'],
  ];
  
  for (const [url, desc] of tests) {
    await testAPI(url, desc);
  }
  
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║       TESTS COMPLETE                               ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  process.exit(0);
}

runTests();
