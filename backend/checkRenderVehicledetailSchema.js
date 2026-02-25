const pg = require('pg');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    await client.connect();
    
    console.log('Checking vehicledetail table schema on Render...\n');
    
    // Get table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicledetail'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in vehicledetail table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n\nSample vehicledetail records:');
    const sampleRes = await client.query(`
      SELECT * FROM vehicledetail LIMIT 3
    `);
    
    console.log(JSON.stringify(sampleRes.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
