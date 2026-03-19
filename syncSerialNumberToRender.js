const { Pool } = require('pg');

async function syncSerialNumberTable() {
  // Local database
  const localPool = new Pool({
    user: 'postgres',
    password: 'admin',
    host: 'localhost',
    port: 5432,
    database: 'Project1db'
  });

  // Render database
  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Starting SerialNumber table sync...\n');

    // Step 1: Get table schema from local
    console.log('📍 Step 1: Checking serialnumber table schema on local...');
    const schemaResult = await localPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'serialnumber'
      ORDER BY ordinal_position
    `);

    if (schemaResult.rows.length === 0) {
      throw new Error('❌ serialnumber table not found in local database!');
    }

    console.log(`✅ Found ${schemaResult.rows.length} columns in serialnumber table`);
    schemaResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Step 2: Get all records from local serialnumber table
    console.log('\n📍 Step 2: Fetching all records from local serialnumber...');
    const recordsResult = await localPool.query('SELECT * FROM serialnumber');
    const records = recordsResult.rows;
    console.log(`✅ Found ${records.length} serial number records`);

    if (records.length === 0) {
      console.log('⚠️  No records to sync. Table is empty.');
      return;
    }

    // Step 3: Check if table exists in Render
    console.log('\n📍 Step 3: Checking if serialnumber table exists in Render...');
    const tableExistsResult = await renderPool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'serialnumber'
    `);

    if (tableExistsResult.rows.length === 0) {
      // Table doesn't exist, create it
      console.log('❌ Table not found in Render. Creating it...');
      
      // Build CREATE TABLE statement based on local schema
      const { sequenceSQL, createTableSQL } = buildCreateTableStatement(schemaResult.rows);
      
      // Create sequence first if needed
      if (sequenceSQL) {
        console.log('\n📝 Creating sequence:\n', sequenceSQL);
        try {
          await renderPool.query(sequenceSQL);
          console.log('✅ Sequence created');
        } catch (error) {
          console.log('⚠️  Sequence creation warning:', error.message);
        }
      }
      
      console.log('\n📝 Creating table with SQL:\n', createTableSQL);
      
      try {
        await renderPool.query(createTableSQL);
        console.log('✅ Table created in Render');
      } catch (error) {
        console.error('❌ Table creation failed:', error.message);
        throw error;
      }
    } else {
      console.log('✅ Table already exists in Render');
    }

    // Step 4: Clear existing records (optional - for clean sync)
    console.log('\n📍 Step 4: Clearing existing records in Render serialnumber...');
    await renderPool.query('DELETE FROM serialnumber');
    console.log('✅ Cleared existing records');

    // Step 5: Insert all records into Render
    console.log('\n📍 Step 5: Inserting records into Render...');
    
    // Get column names from first record
    const columns = Object.keys(records[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `
      INSERT INTO serialnumber (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    let insertedCount = 0;
    for (const record of records) {
      const values = columns.map(col => record[col]);
      try {
        await renderPool.query(insertSQL, values);
        insertedCount++;
      } catch (error) {
        console.error(`❌ Error inserting record:`, record, error.message);
      }
    }

    console.log(`✅ Inserted ${insertedCount}/${records.length} records successfully`);

    // Step 6: Verify sync
    console.log('\n📍 Step 6: Verifying sync in Render...');
    const verifyResult = await renderPool.query('SELECT COUNT(*) as count FROM serialnumber');
    const renderCount = verifyResult.rows[0].count;
    console.log(`✅ Render now has ${renderCount} serial number records`);

    if (renderCount === records.length) {
      console.log('\n🎉 SUCCESS! SerialNumber table synced completely!');
    } else {
      console.log(`\n⚠️  Warning: Expected ${records.length} records but found ${renderCount}`);
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

function buildCreateTableStatement(schemaRows) {
  // First, create sequence if needed
  let sequenceSQL = '';
  
  const columnDefinitions = schemaRows.map(col => {
    let def = `${col.column_name} ${col.data_type}`;
    
    // Add NOT NULL if needed
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    // Handle defaults - skip sequence references
    if (col.column_default) {
      if (col.column_default.includes('nextval')) {
        // Create sequence first
        const sequenceName = col.column_default.match(/'([^']+)'/)?.[1];
        if (sequenceName) {
          sequenceSQL = `CREATE SEQUENCE IF NOT EXISTS ${sequenceName} START WITH 1;`;
        }
        def += ` DEFAULT ${col.column_default}`;
      } else if (col.column_default.includes('::')) {
        // Handle CAST syntax
        def += ` DEFAULT ${col.column_default}`;
      } else {
        def += ` DEFAULT ${col.column_default}`;
      }
    }
    
    return def;
  }).join(',\n    ');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS serialnumber (
      ${columnDefinitions}
    )
  `;

  return { sequenceSQL, createTableSQL };
}

syncSerialNumberTable();
