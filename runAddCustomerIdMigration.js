// Call the migration endpoint on Render to add customerid column to vehicledetail
const axios = require('axios');

const RENDER_BACKEND_URL = 'https://project1-backend1.onrender.com/api';

async function runMigration() {
  try {
    console.log('Running migration to add customerid column to vehicledetail...\n');
    console.log(`Endpoint: POST ${RENDER_BACKEND_URL}/admin/migrate/add-customerid\n`);
    
    const response = await axios.post(`${RENDER_BACKEND_URL}/admin/migrate/add-customerid`);
    
    if (response.data.success) {
      console.log('✅ Migration successful!\n');
      console.log('Result:');
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ Migration failed:');
      console.log(response.data.message);
    }
  } catch (error) {
    console.error('❌ Error calling migration endpoint:');
    console.error(error.message);
    if (error.response?.data) {
      console.error(error.response.data);
    }
  }
}

runMigration();
