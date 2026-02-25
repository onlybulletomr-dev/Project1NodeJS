const https = require('https');

console.log('\n🔍 TESTING RENDER BACKEND CONNECTIVITY:\n');

https.get('https://project1-backend1.onrender.com/api/customer/50/vehicle-details', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Backend is responding!');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Data: ${json.data.length} vehicles returned`);
    } catch (e) {
      console.log('⚠️  Response received but not JSON');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Body: ${data.substring(0, 100)}`);
    }
  });
}).on('error', (err) => {
  console.log('❌ BACKEND NOT RESPONDING');
  console.log(`   Error: ${err.message}`);
  console.log('\n💡 Render backend might be:');
  console.log('   - Starting up (takes 1-2 mins on initial deploy)');
  console.log('   - Down or crashed');
  console.log('   - Having connectivity issues');
  process.exit(1);
});
