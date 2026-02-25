// Quick test script to verify role management endpoints
const http = require('http');

function testEndpoint(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          path: path,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (err) => {
      reject({
        path: path,
        error: err.message
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n=== Testing Role Management Endpoints ===\n');

  const endpoints = [
    { path: '/health', method: 'GET' },
    { path: '/api/roles/employees', method: 'GET' },
    { path: '/api/roles/branches', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const result = await testEndpoint(endpoint.path, endpoint.method);
      console.log(`✓ ${endpoint.method} ${endpoint.path}`);
      console.log(`  Status: ${result.status}`);
      if (result.data) {
        console.log(`  Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } catch (err) {
      console.log(`✗ ${endpoint.method} ${endpoint.path}`);
      console.log(`  Error: ${err.error}`);
    }
    console.log('');
  }
}

runTests();
