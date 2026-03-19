const http = require('http');

// Test the search endpoint
const testSearch = (query) => {
  const path = `/api/items-services/search?q=${encodeURIComponent(query)}`;
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: path,
    method: 'GET',
    headers: {
      'x-user-id': '1'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`Query: "${query}"`);
        console.log(`Found ${json.data.length} items`);
        json.data.forEach(item => {
          console.log(`  - ${item.partnumber}: ${item.itemname} (Serial Tracking: ${item.serialnumbertracking})`);
        });
      } catch(e) {
        console.error('Parse error:', e.message);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });
  
  req.end();
};

// Test searches
console.log('Testing search endpoint...\n');
testSearch('tyre');
setTimeout(() => {
  testSearch('battery');
}, 500);

setTimeout(() => {
  process.exit(0);
}, 2000);
