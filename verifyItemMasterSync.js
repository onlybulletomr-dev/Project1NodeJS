#!/usr/bin/env node

const { Pool } = require('pg');

const renderPool = new Pool({
  host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
  port: 5432,
  database: 'project1_z6zd',
  user: 'project1_user',
  password: 'abc123',
  ssl: true
});

async function verify() {
  try {
    const result = await renderPool.query(`
      SELECT COUNT(*) as total FROM itemmaster WHERE deletedat IS NULL
    `);
    
    console.log('✅ ITEMMASTER SYNC VERIFICATION');
    console.log(`Records on Render: ${result.rows[0].total}`);
    
    // Check columns
    const schemaResult = await renderPool.query(`
      SELECT COUNT(*) as col_count FROM information_schema.columns
      WHERE table_name = 'itemmaster' AND table_schema = 'public'
    `);
    
    console.log(`Columns on Render: ${schemaResult.rows[0].col_count}`);
    
    // Sample records
    const sampleResult = await renderPool.query(`
      SELECT itemid, partnumber, itemname, discountpercentage, points FROM itemmaster LIMIT 3
    `);
    
    console.log('\nSample records:');
    sampleResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.partnumber} - ${row.itemname.substring(0, 40)}`);
    });
    
    await renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

verify();
