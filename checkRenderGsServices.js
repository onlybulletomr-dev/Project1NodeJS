const { Pool } = require('pg');

// Render database connection
const renderPool = new Pool({
  connectionString: 'postgresql://ashok_user:aAsVINx42TjdPzODh8OeKVxVJvqQp1Q2@dpg-cuh3e3jqf0us73b13br0-a.oregon-postgres.render.com:5432/project1db_nrlz',
  statement_timeout: 30000,
  idleTimeoutMillis: 10000,
  max: 1
});

async function checkRenderServices() {
  try {
    console.log('=== CHECKING RENDER SERVICEMASTER FOR GS SERVICES ===\n');

    // Check Render database for services 1, 2, 3
    console.log('--- Render Database (Services 1, 2, 3) ---');
    const renderResult = await renderPool.query(
      `SELECT serviceid, servicenumber, servicename, defaultrate, description 
       FROM ServiceMaster 
       WHERE serviceid IN (1, 2, 3) 
       ORDER BY serviceid`
    );
    console.log('Render Services:', JSON.stringify(renderResult.rows, null, 2));

    // Compare with expected values
    console.log('\n--- COMPARISON WITH LOCAL DATABASE ---');
    const expected = [
      { serviceid: 1, servicenumber: "OB-LA01", servicename: "WATER WASH" },
      { serviceid: 2, servicenumber: "OB-LA02", servicename: "CONSUMABLES" },
      { serviceid: 3, servicenumber: "OB-LA03", servicename: "GENERAL SERVICE" }
    ];

    let allMatch = true;
    expected.forEach(exp => {
      const renderService = renderResult.rows.find(s => s.serviceid === exp.serviceid);
      if (renderService) {
        const match = renderService.servicenumber === exp.servicenumber;
        console.log(`Service ${exp.serviceid}: ${match ? '✓ MATCH' : '✗ MISMATCH'}`);
        if (!match) {
          console.log(`  Expected: ${exp.servicenumber}, Got: ${renderService.servicenumber}`);
          allMatch = false;
        }
      } else {
        console.log(`Service ${exp.serviceid}: ✗ NOT FOUND`);
        allMatch = false;
      }
    });

    // Check total services count
    console.log('\n--- Total Services Count ---');
    const countResult = await renderPool.query('SELECT COUNT(*) as count FROM ServiceMaster WHERE deletedat IS NULL');
    console.log('Render ServiceMaster count:', countResult.rows[0].count);

    console.log('\n=== ANALYSIS ===');
    if (allMatch && renderResult.rows.length === 3) {
      console.log('✓ CONCLUSION: All GS services are correctly synced on Render with proper servicenumber values.');
      console.log('  The issue is NOT a database sync problem.');
      console.log('  The issue must be in the FRONTEND or how the saved invoice data is being displayed.');
    } else {
      console.log('✗ CONCLUSION: GS services are NOT properly synced on Render.');
      console.log('  Action: Need to sync servicemaster table to Render with proper servicenumber values.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await renderPool.end();
  }
}

checkRenderServices();
