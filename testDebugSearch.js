const http = require('http');

function makeRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('RAW RESPONSE:', data);
        console.log('STATUS:', res.statusCode);
        try {
          const parsed = JSON.parse(data);
          console.log('PARSED:', JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log('PARSE ERROR:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.log('REQUEST ERROR:', e.message);
      resolve(null);
    });

    req.end();
  });
}

async function test() {
  console.log('Testing search endpoint...\n');
  const result = await makeRequest('/api/items-services/search?q=tyre');
  console.log('\nFinal result:', result);
}

test();
