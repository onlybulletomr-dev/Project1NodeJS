const pool = require('./backend/config/db');

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'serialnumber' 
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ serialnumber table does not exist');
      process.exit(1);
    }
    
    console.log('✅ serialnumber table exists\n');
    console.log('Columns:');
    result.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? 'nullable' : 'NOT NULL';
      console.log(`  ${r.column_name}: ${r.data_type} [${nullable}]`);
    });
    
    // Check sample data
    const dataResult = await pool.query('SELECT COUNT(*) as count FROM serialnumber WHERE deletedat IS NULL');
    console.log(`\nTotal serial numbers: ${dataResult.rows[0].count}`);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
