const ServiceMaster = require('./backend/models/ServiceMaster');

async function testServiceMaster() {
  try {
    console.log('Testing ServiceMaster.getAll()...\n');
    const services = await ServiceMaster.getAll();
    
    console.log(`✓ Total services: ${services.length}\n`);
    
    // Find service 25
    const service25 = services.find(s => s.serviceid === 25);
    if (service25) {
      console.log('✓ Service 25 found:');
      console.log(JSON.stringify(service25, null, 2));
    } else {
      console.log('❌ Service 25 NOT found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testServiceMaster();
