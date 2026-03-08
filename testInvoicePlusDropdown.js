const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/items-services/search?q=',
  method: 'GET',
  headers: {
    'x-user-id': '12'  // Ashok
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const items = parsed.data.filter(d => d.source === 'item');
      const services = parsed.data.filter(d => d.source === 'service');
      
      console.log('\n=== INVOICE+ DROPDOWN - USER 12 (ASHOK) ===');
      console.log(`Total items: ${items.length}`);
      console.log(`Total services: ${services.length}`);
      
      console.log('\n✓ Items available:');
      items.forEach(item => {
        console.log(`  - ${item.itemnumber}: ${item.itemdescription} (Qty: ${item.availableqty})`);
      });
      
      console.log('\n✓ Services available:');
      services.slice(0, 5).forEach(service => {
        console.log(`  - ${service.itemnumber}: ${service.itemdescription}`);
      });
      
      // Verify 888414
      const found = items.find(item => item.itemnumber === '888414');
      if (found) {
        console.log(`\n✓✓ SUCCESS: Item 888414 found with qty=${found.availableqty}`);
      } else {
        console.log('\n✗ 888414 not found');
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  process.exit(1);
});

req.end();
