const Vehicle = require('./models/Vehicle');

async function testColors() {
  const models = ['Classic 350 Reborn', 'Classic 500', 'Classic 650', 'Goan Classic 350', 'Machismo 500'];
  
  console.log('Testing getUniqueColors from vehiclemaster:\n');
  
  for (const model of models) {
    try {
      const colors = await Vehicle.getUniqueColors(model);
      console.log(`${model}: ${colors.length} colors`);
      colors.forEach(c => console.log(`  - ${c}`));
      console.log('');
    } catch (err) {
      console.log(`${model}: ERROR - ${err.message}`);
    }
  }
  
  process.exit(0);
}

testColors();
