const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const renderPool = new Pool({
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function syncServices() {
  const client = await renderPool.connect();
  
  try {
    console.log('=== SYNCING SERVICES FROM DEV TO RENDER ===\n');
    
    // The correct service data from DEV
    const devServices = [
      {
        serviceid: 1,
        servicenumber: 'OB-LA01',
        servicename: 'WATER WASH',
        description: 'WATER WASH',
        defaultrate: 150.00
      },
      {
        serviceid: 2,
        servicenumber: 'OB-LA02',
        servicename: 'CONSUMABLES',
        description: 'CONSUMABLES',
        defaultrate: 180.00
      },
      {
        serviceid: 3,
        servicenumber: 'OB-LA03',
        servicename: 'GENERAL SERVICE',
        description: 'GENERAL SERVICE',
        defaultrate: 880.00
      }
    ];
    
    console.log('Current services in Render:');
    const beforeResult = await client.query(`
      SELECT serviceid, servicenumber, servicename, description, defaultrate
      FROM servicemaster 
      WHERE serviceid IN (1, 2, 3) 
      ORDER BY serviceid
    `);
    beforeResult.rows.forEach(row => {
      console.log(`  ID ${row.serviceid}: ${row.servicenumber} - ${row.servicename}`);
    });
    
    console.log('\nUpdating to match DEV environment...\n');
    
    await client.query('BEGIN');
    
    // Update each service
    for (const svc of devServices) {
      await client.query(`
        UPDATE servicemaster 
        SET 
          servicenumber = $1,
          servicename = $2,
          description = $3,
          defaultrate = $4,
          updatedby = 1,
          updatedat = NOW()
        WHERE serviceid = $5
      `, [svc.servicenumber, svc.servicename, svc.description, svc.defaultrate, svc.serviceid]);
      
      console.log(`✓ Updated ID ${svc.serviceid}: ${svc.servicenumber} - ${svc.servicename}`);
    }
    
    await client.query('COMMIT');
    
    // Verify
    console.log('\nVerifying updates in Render:\n');
    const afterResult = await client.query(`
      SELECT serviceid, servicenumber, servicename, description, defaultrate
      FROM servicemaster 
      WHERE serviceid IN (1, 2, 3) 
      ORDER BY serviceid
    `);
    
    afterResult.rows.forEach(row => {
      console.log(`  ID ${row.serviceid}: ${row.servicenumber} - ${row.servicename} (₹${row.defaultrate})`);
    });
    
    console.log('\n✅ SERVICES SYNCED SUCCESSFULLY!\n');
    console.log('Render now matches DEV environment');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await renderPool.end();
  }
}

syncServices();
