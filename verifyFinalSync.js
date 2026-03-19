#!/usr/bin/env node

const {Pool} = require('pg');

const pool = new Pool({
  host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
  port: 5432,
  database: 'project1db_nrlz',
  user: 'postgres1',
  password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
  ssl: {rejectUnauthorized: false}
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE deletedat IS NULL) as active_records,
        (SELECT COUNT(DISTINCT column_name) FROM information_schema.columns WHERE table_name='itemmaster') as column_count
      FROM itemmaster
    `);
    
    const row = result.rows[0];
    console.log('\n✅ ITEMMASTER SYNC - FINAL STATUS\n');
    console.log(`📊 Total Records:    ${row.total_records.toString().padStart(6)} ✓`);
    console.log(`📊 Active Records:   ${row.active_records.toString().padStart(6)} ✓`);
    console.log(`📊 Columns:          ${row.column_count.toString().padStart(6)} ✓`);
    
    if (row.total_records >= 11428) {
      console.log('\n✨ ALL 11,428 RECORDS SUCCESSFULLY SYNCED TO RENDER!\n');
    } else {
      console.log(`\n⚠️  Only ${row.total_records} records synced (expected 11,428)\n`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
