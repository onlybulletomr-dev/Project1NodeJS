const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/items-services/search?q=888297',
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
      console.log('\n=== SEARCH ENDPOINT RESPONSE FOR 888297 ===\n');
      
      if (parsed.data && parsed.data.length > 0) {
        const item = parsed.data.find(d => d.partnumber === '888297');
        if (item) {
          console.log('✓ Item 888297 found in search results:');
          console.log(JSON.stringify(item, null, 2));
          
          console.log('\n=== FIELD VERIFICATION ===');
          console.log(`✓ servicechargeid present: value = ${item.servicechargeid}`);
          console.log(`${item.servicechargemethod ? '✓' : '✗'} servicechargemethod present: value = "${item.servicechargemethod}"`);
          
          if (!item.servicechargemethod) {
            console.log('\n❌ PROBLEM: servicechargemethod is MISSING from API response!');
            console.log('Available fields:', Object.keys(item).join(', '));
          } else {
            console.log('\n✅ servicechargemethod is present in response');
          }
        } else {
          console.log('❌ Item 888297 NOT found in search results');
          console.log(`Total results: ${parsed.data.length}`);
        }
      } else {
        console.log('No items returned');
      }
    } catch (error) {
      console.log('Error parsing response:', error.message);
    }
  });
});

req.end();
