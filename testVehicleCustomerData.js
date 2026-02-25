// Test vehicle details endpoint to verify customerid is returned
const axios = require('axios');

const RENDER_BACKEND_URL = 'https://project1-backend1.onrender.com/api';

async function testVehicleDetailsEndpoint() {
  try {
    console.log('Testing vehicle details endpoint on Render...');
    console.log(`URL: ${RENDER_BACKEND_URL}/vehicle-details\n`);
    
    const response = await axios.get(`${RENDER_BACKEND_URL}/vehicle-details`);
    
    if (response.data.success) {
      const vehicles = response.data.data;
      console.log(`✅ Successfully retrieved ${vehicles.length} vehicles\n`);
      
      if (vehicles.length > 0) {
        console.log('Sample vehicles:');
        vehicles.slice(0, 3).forEach((v, i) => {
          console.log(`\nVehicle ${i + 1}:`);
          console.log(`  vehicleid: ${v.vehicleid}`);
          console.log(`  vehiclenumber: ${v.vehiclenumber}`);
          console.log(`  vehiclemodel: ${v.vehiclemodel}`);
          console.log(`  vehiclecolor: ${v.vehiclecolor}`);
          console.log(`  customerid: ${v.customerid}`);
          
          if (!v.customerid) {
            console.log('  ❌ WARNING: customerid is missing!');
          } else {
            console.log('  ✅ customerid found');
          }
        });
      }
    } else {
      console.log('❌ Error:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error fetching vehicle details:', error.message);
  }
}

async function testCustomersEndpoint() {
  try {
    console.log('\n\nTesting customers endpoint on Render...');
    console.log(`URL: ${RENDER_BACKEND_URL}/customers\n`);
    
    const response = await axios.get(`${RENDER_BACKEND_URL}/customers`);
    
    if (response.data.success) {
      const customers = response.data.data;
      console.log(`✅ Successfully retrieved ${customers.length} customers\n`);
      
      if (customers.length > 0) {
        console.log('Sample customers:');
        customers.slice(0, 3).forEach((c, i) => {
          console.log(`\nCustomer ${i + 1}:`);
          console.log(`  CustomerID: ${c.CustomerID || c.customerid}`);
          console.log(`  FirstName: ${c.FirstName || c.firstname}`);
          console.log(`  LastName: ${c.LastName || c.lastname}`);
        });
      }
    } else {
      console.log('❌ Error:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('Vehicle & Customer Data Integration Test');
  console.log('========================================\n');
  
  await testVehicleDetailsEndpoint();
  await testCustomersEndpoint();
  
  console.log('\n========================================');
  console.log('Test complete!');
  console.log('========================================');
}

runAllTests();
