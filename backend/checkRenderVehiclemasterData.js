const https = require('https');

console.log('Checking Render vehiclemaster data...\n');

const options = {
  hostname: 'project1-backend1.onrender.com',
  path: '/admin/check/vehiclemaster',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\nVehiclemaster on Render:');
      console.log('Total records:', parsed.total_records);
      console.log('Unique models:', parsed.unique_models);
      console.log('\nModels:');
      if (parsed.models) {
        parsed.models.forEach(m => console.log(`  ${m.modelname}: ${m.color_count} variants`));
      }
    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Response:', data.substring(0, 300));
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
