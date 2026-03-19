const http = require('http');

function makeRequest(query) {
  return new Promise((resolve) => {
    const url = `http://localhost:5000/api/items-services/search?q=${encodeURIComponent(query)}&branchid=1`;
    console.log(`\n🔍 Testing search: "${query}"`);
    console.log(`URL: ${url}`);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/items-services/search?q=${encodeURIComponent(query)}&branchid=1`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response:`, JSON.stringify(result, null, 2));
          console.log(`Found items: ${result.items?.length || 0}`);
          console.log(`Found services: ${result.services?.length || 0}`);
          if (result.items && result.items.length > 0) {
            console.log(`Items:`, result.items.map(i => `${i.partnumber} (${i.itemname})`).join(', '));
          }
          resolve(result);
        } catch (e) {
          console.log('Error parsing response:', e.message);
          resolve({ error: e.message });
        }
      });
    });

    req.on('error', (e) => {
      console.log('Request error:', e.message);
      resolve({ error: e.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('=== Testing Search Endpoint After Backend Restart ===\n');
  await makeRequest('tyre');
  await new Promise(resolve => setTimeout(resolve, 500));
  await makeRequest('battery');
  await new Promise(resolve => setTimeout(resolve, 500));
  await makeRequest('oil');
  console.log('\n✅ Tests complete');
}

runTests();
