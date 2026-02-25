const localDb = require('./config/db');
const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function migrateVehiclemaster() {
  let localClient, renderClient;
  
  try {
    console.log('Starting vehiclemaster migration...\n');
    
    // Get connection objects
    localClient = localDb;
    renderClient = renderPool;
    
    // Get all vehiclemaster records from local
    localDb.query('SELECT * FROM vehiclemaster ORDER BY vehicleid', async (err, localRes) => {
      if (err) {
        console.error('❌ Error reading local vehiclemaster:', err.message);
        renderPool.end();
        localDb.end();
        return;
      }
      
      const records = localRes.rows;
      console.log(`📊 Found ${records.length} vehiclemaster records locally\n`);
      
      try {
        // Delete existing records from Render (keep it clean)
        await renderPool.query('DELETE FROM vehiclemaster WHERE TRUE');
        console.log('✓ Cleared Render vehiclemaster table');
        
        // Prepare insert statement
        let insertCount = 0;
        let skipCount = 0;
        
        for (const record of records) {
          try {
            await renderPool.query(
              `INSERT INTO vehiclemaster 
               (vehicleid, modelname, manufacturername, fueltype, modelsegment, enginetype, color,
                serviceintervalkms, serviceintervalmonths, oilgrade, oilquantity, introducedperiod,
                discontinuedperiod, extravar1, extravar2, extraint1, createdby, createdat, updatedby,
                updatedat, deletedby, deletedat, branchid)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
              [
                record.vehicleid, record.modelname, record.manufacturername, record.fueltype,
                record.modelsegment, record.enginetype, record.color, record.serviceintervalkms,
                record.serviceintervalmonths, record.oilgrade, record.oilquantity, record.introducedperiod,
                record.discontinuedperiod, record.extravar1, record.extravar2, record.extraint1,
                record.createdby, record.createdat, record.updatedby, record.updatedat,
                record.deletedby, record.deletedat, record.branchid
              ]
            );
            insertCount++;
          } catch (insertErr) {
            skipCount++;
            console.log(`  ⚠️  Skipped record ID ${record.vehicleid}: ${insertErr.message.substring(0, 50)}`);
          }
        }
        
        console.log(`\n✅ Migration complete:`);
        console.log(`  Inserted: ${insertCount} records`);
        console.log(`  Skipped: ${skipCount} records`);
        
        // Verify
        const verifyRes = await renderPool.query(
          'SELECT DISTINCT modelname FROM vehiclemaster WHERE deletedat IS NULL ORDER BY modelname'
        );
        console.log(`\n📋 Render now has ${verifyRes.rows.length} unique models:`);
        verifyRes.rows.forEach(r => console.log(`    - ${r.modelname}`));
        
        await renderPool.end();
      } catch (err) {
        console.error('❌ Migration error:', err.message);
        await renderPool.end();
      }
      
      localDb.end();
    });
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (renderPool) await renderPool.end();
    if (localDb) localDb.end();
  }
}

migrateVehiclemaster();
