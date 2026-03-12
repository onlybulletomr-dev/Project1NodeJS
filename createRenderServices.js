const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function insertServices() {
  const client = await pool.connect();
  
  try {
    console.log('=== CREATING GENERAL SERVICE ITEMS ON RENDER ===\n');
    
    await client.query('BEGIN');
    
    // Get default taxrateid (1 is common)
    const taxResult = await client.query('SELECT MIN(taxrateid) as min_taxid FROM servicemaster LIMIT 1');
    const taxRateId = taxResult.rows[0].min_taxid || 1;
    
    console.log('Inserting services 1, 2, 3...\n');
    
    const result = await client.query(`
      INSERT INTO servicemaster (
        serviceid, servicenumber, servicename, description,
        billingtype, defaultrate, taxrateid,
        createdby, createdat
      ) VALUES 
        (1, 'GSWASH001', 'Water Wash', 'Water Wash Service', 'Fixed', 150.00, $1, 1, NOW()),
        (2, 'GSCHEM002', 'Chemical Charges', 'Chemical Charges for vehicles', 'Fixed', 180.00, $1, 1, NOW()),
        (3, 'GSSERV003', 'General Service', 'General Service Package', 'Fixed', 880.00, $1, 1, NOW())
      ON CONFLICT (serviceid) DO UPDATE SET
        servicename = EXCLUDED.servicename,
        description = EXCLUDED.description,
        defaultrate = EXCLUDED.defaultrate
      RETURNING serviceid, servicenumber, servicename, defaultrate
    `, [taxRateId]);
    
    console.log('✓ Services created:\n');
    result.rows.forEach(row => {
      console.log(`  ID ${row.serviceid}: ${row.servicenumber} - "${row.servicename}" (₹${row.defaultrate})`);
    });
    
    // Verify
    console.log('\nVerifying services 1, 2, 3:\n');
    const verifyResult = await client.query(`
      SELECT serviceid, servicenumber, servicename, description, defaultrate
      FROM servicemaster 
      WHERE serviceid IN (1, 2, 3) 
      ORDER BY serviceid
    `);
    
    verifyResult.rows.forEach(row => {
      console.log(`  ID ${row.serviceid}: "${row.servicename}"`);
      console.log(`    Number: ${row.servicenumber}`);
      console.log(`    Description: ${row.description}`);
      console.log(`    Rate: ₹${row.defaultrate}\n`);
    });
    
    await client.query('COMMIT');
    console.log('✅ SUCCESS! Services are now ready on Render\n');
    console.log('Note: Refresh your browser to see the updated invoice items');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', error.message);
    console.error('\nThis likely means the General Service services already exist.');
    console.error('You may need to manually update them in the database.');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

insertServices();
