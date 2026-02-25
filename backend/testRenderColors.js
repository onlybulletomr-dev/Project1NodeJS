const https = require('https');

const models = ['Classic 500', 'Classic 650', 'Goan Classic 350', 'Machismo 500'];

console.log('Testing Render color endpoints:\n');

let completed = 0;

models.forEach(model => {
  const encodedModel = encodeURIComponent(model);
  const options = {
    hostname: 'project1-backend1.onrender.com',
    path: `/api/vehicles/unique/colors?model=${encodedModel}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`${model}: ${parsed.data ? parsed.data.length : 0} colors`);
        if (parsed.data && parsed.data.length > 0) {
          parsed.data.forEach(c => console.log(`  - ${c}`));
        }
      } catch (e) {
        console.log(`${model}: Error parsing response`);
      }
      
      completed++;
      if (completed === models.length) {
        console.log('\n✅ All tests complete');
      }
    });
  });

  req.on('error', (e) => {
    console.log(`${model}: ${e.message}`);
    completed++;
    if (completed === models.length) {
      console.log('\n✅ All tests complete');
    }
  });

  req.end();
});
