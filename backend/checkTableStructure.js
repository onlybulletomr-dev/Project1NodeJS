const pool = require('./config/db');

async function checkTables() {
  try {
    // Check paymentdetail columns
    const paymentCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns " +
      "WHERE table_name = 'paymentdetail' ORDER BY ordinal_position"
    );
    
    console.log('✅ PAYMENTDETAIL TABLE COLUMNS:');
    paymentCols.rows.forEach(col => {
      console.log(`   ${col.column_name} | ${col.data_type}`);
    });

    // Check vehicle detail table name
    const vehicleTables = await pool.query(
      "SELECT table_name FROM information_schema.tables " +
      "WHERE table_schema = 'public' AND table_name LIKE '%vehicle%'"
    );
    
    console.log('\n✅ VEHICLE RELATED TABLES IN DATABASE:');
    vehicleTables.rows.forEach(tbl => {
      console.log(`   ${tbl.table_name}`);
    });

    // Check vehicledetail columns
    const vehicleCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns " +
      "WHERE table_name = 'vehicledetail' ORDER BY ordinal_position"
    );
    
    console.log('\n✅ VEHICLEDETAIL TABLE COLUMNS:');
    vehicleCols.rows.forEach(col => {
      console.log(`   ${col.column_name} | ${col.data_type}`);
    });

    // Check foreign keys in paymentdetail
    const fks = await pool.query(
      "SELECT constraint_name, column_name, referenced_table_name " +
      "FROM information_schema.key_column_usage " +
      "WHERE table_name = 'paymentdetail' AND referenced_table_name IS NOT NULL"
    );
    
    console.log('\n✅ FOREIGN KEYS IN PAYMENTDETAIL:');
    if (fks.rows.length === 0) {
      // Try different query for PostgreSQL
      const pgFks = await pool.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='paymentdetail'
      `);
      
      pgFks.rows.forEach(fk => {
        console.log(`   ${fk.constraint_name}: ${fk.column_name} -> ${fk.referenced_table_name}(${fk.referenced_column_name})`);
      });
    } else {
      fks.rows.forEach(fk => {
        console.log(`   ${fk.constraint_name}: ${fk.column_name} -> ${fk.referenced_table_name}`);
      });
    }

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

checkTables();
