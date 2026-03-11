const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Local database connection
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'project1',
});

// Render database connection
const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function migrateEmployeeData() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║      EMPLOYEE DATA MIGRATION                          ║');
    console.log('║      Local → Render Environment                       ║');
    console.log('║      (employeemaster + employeecredentials)           ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Check if Render credentials are provided
    if (!process.env.RENDER_DB_HOST) {
      console.log('❌ Render database credentials not set in environment.');
      console.log('Please set these environment variables:');
      console.log('  - RENDER_DB_HOST');
      console.log('  - RENDER_DB_USER');
      console.log('  - RENDER_DB_PASSWORD');
      console.log('  - RENDER_DB_NAME');
      console.log('\nYou can get these from your Render dashboard.');
      process.exit(1);
    }

    const localClient = await localPool.connect();
    const renderClient = await renderPool.connect();

    try {
      console.log('✓ Connected to both databases\n');

      // ===== MIGRATION 1: EMPLOYEEMASTER TABLE =====
      console.log('═══════════════════════════════════════════════════════');
      console.log('PART 1: EMPLOYEE MASTER DATA');
      console.log('═══════════════════════════════════════════════════════\n');

      // STEP 1: Get table structure from local
      console.log('STEP 1: Fetching employeemaster structure from local...');
      const empMasterStructure = await localClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'employeemaster'
        ORDER BY ordinal_position
      `);

      if (empMasterStructure.rows.length === 0) {
        console.log('❌ employeemaster table not found in local database');
        process.exit(1);
      }

      console.log(`✓ Found ${empMasterStructure.rows.length} columns\n`);

      // STEP 2: Create table in Render
      console.log('STEP 2: Creating employeemaster table in Render...');
      try {
        await renderClient.query('DROP TABLE IF EXISTS employeemaster CASCADE');
      } catch (e) {
        // ignore
      }
      
      const empMasterColumns = empMasterStructure.rows;
      const empMasterColumnDefs = empMasterColumns.map(col => {
        let def = `"${col.column_name}" ${col.data_type}`;
        if (col.is_nullable === 'NO' && col.column_name !== 'employeeid') {
          def += ' NOT NULL';
        }
        if (col.column_default && !col.column_default.includes('nextval')) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      }).join(',\n  ');

      const createEmpMasterQuery = `CREATE TABLE employeemaster (
        ${empMasterColumnDefs},
        PRIMARY KEY (employeeid)
      )`;

      try {
        await renderClient.query(createEmpMasterQuery);
        console.log('✓ employeemaster table created\n');
      } catch (createErr) {
        console.log('  Attempting simplified creation...');
        const simpleEmpMasterDefs = empMasterColumns.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.column_name === 'employeeid') {
            def = `"${col.column_name}" SERIAL PRIMARY KEY`;
          } else if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          return def;
        }).join(',\n  ');
        
        const simpleCreateQuery = `CREATE TABLE employeemaster (
          ${simpleEmpMasterDefs}
        )`;
        
        await renderClient.query(simpleCreateQuery);
        console.log('✓ employeemaster table created (simplified)\n');
      }

      // STEP 3: Fetch and insert records
      console.log('STEP 3: Fetching employeemaster records from local...');
      const empMasterRecords = await localClient.query('SELECT * FROM employeemaster');
      const empRecords = empMasterRecords.rows;
      console.log(`✓ Found ${empRecords.length} employees\n`);

      console.log('STEP 4: Inserting employee records to Render...');
      const empMasterColumnNames = empMasterColumns.map(col => `"${col.column_name}"`).join(', ');
      const empMasterPlaceholders = empMasterColumns.map((_, i) => `$${i + 1}`).join(', ');
      const insertEmpMasterQuery = `INSERT INTO employeemaster (${empMasterColumnNames}) VALUES (${empMasterPlaceholders})`;

      let empInsertCount = 0;
      let empSkipCount = 0;

      for (const record of empRecords) {
        try {
          const values = empMasterColumns.map(col => record[col.column_name]);
          await renderClient.query(insertEmpMasterQuery, values);
          empInsertCount++;
        } catch (insertErr) {
          empSkipCount++;
          console.log(`  ⚠️  Skipped employee ID ${record.employeeid}: ${insertErr.message.substring(0, 60)}`);
        }
      }

      console.log(`✓ Inserted: ${empInsertCount} employees\n`);

      // ===== MIGRATION 2: EMPLOYEECREDENTIALS TABLE =====
      console.log('═══════════════════════════════════════════════════════');
      console.log('PART 2: EMPLOYEE CREDENTIALS DATA');
      console.log('═══════════════════════════════════════════════════════\n');

      // STEP 5: Get credentials table structure
      console.log('STEP 5: Fetching employeecredentials structure from local...');
      const credStructure = await localClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'employeecredentials'
        ORDER BY ordinal_position
      `);

      if (credStructure.rows.length === 0) {
        console.log('⚠️  employeecredentials table not found in local database\n');
      } else {
        console.log(`✓ Found ${credStructure.rows.length} columns\n`);

        // STEP 6: Create credentials table in Render
        console.log('STEP 6: Creating employeecredentials table in Render...');
        try {
          await renderClient.query('DROP TABLE IF EXISTS employeecredentials CASCADE');
        } catch (e) {
          // ignore
        }
        
        const credColumns = credStructure.rows;
        const credColumnDefs = credColumns.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO' && col.column_name !== 'credentialid') {
            def += ' NOT NULL';
          }
          if (col.column_default && !col.column_default.includes('nextval')) {
            def += ` DEFAULT ${col.column_default}`;
          }
          return def;
        }).join(',\n  ');

        const createCredQuery = `CREATE TABLE employeecredentials (
          ${credColumnDefs},
          PRIMARY KEY (credentialid)
        )`;

        try {
          await renderClient.query(createCredQuery);
          console.log('✓ employeecredentials table created\n');
        } catch (createErr) {
          console.log('  Attempting simplified creation...');
          const simpleCredDefs = credColumns.map(col => {
            let def = `"${col.column_name}" ${col.data_type}`;
            if (col.column_name === 'credentialid') {
              def = `"${col.column_name}" SERIAL PRIMARY KEY`;
            } else if (col.is_nullable === 'NO') {
              def += ' NOT NULL';
            }
            return def;
          }).join(',\n  ');
          
          const simpleCreateCredQuery = `CREATE TABLE employeecredentials (
            ${simpleCredDefs}
          )`;
          
          await renderClient.query(simpleCreateCredQuery);
          console.log('✓ employeecredentials table created (simplified)\n');
        }

        // STEP 7: Fetch and insert credentials
        console.log('STEP 7: Fetching employeecredentials records from local...');
        const credRecords = await localClient.query('SELECT * FROM employeecredentials');
        const credentials = credRecords.rows;
        console.log(`✓ Found ${credentials.length} credential records\n`);

        console.log('STEP 8: Inserting credential records to Render...');
        const credColumnNames = credColumns.map(col => `"${col.column_name}"`).join(', ');
        const credPlaceholders = credColumns.map((_, i) => `$${i + 1}`).join(', ');
        const insertCredQuery = `INSERT INTO employeecredentials (${credColumnNames}) VALUES (${credPlaceholders})`;

        let credInsertCount = 0;
        let credSkipCount = 0;

        for (const record of credentials) {
          try {
            const values = credColumns.map(col => record[col.column_name]);
            await renderClient.query(insertCredQuery, values);
            credInsertCount++;
          } catch (insertErr) {
            credSkipCount++;
            console.log(`  ⚠️  Skipped credential ID ${record.credentialid}: ${insertErr.message.substring(0, 60)}`);
          }
        }

        console.log(`✓ Inserted: ${credInsertCount} credential records\n`);
      }

      // STEP 9: Verify migration
      console.log('═══════════════════════════════════════════════════════');
      console.log('VERIFICATION');
      console.log('═══════════════════════════════════════════════════════\n');

      const empVerify = await renderClient.query('SELECT COUNT(*) as count FROM employeemaster');
      console.log(`✓ Render employeemaster: ${empVerify.rows[0].count} records`);

      const credVerify = await renderClient.query('SELECT COUNT(*) as count FROM employeecredentials');
      console.log(`✓ Render employeecredentials: ${credVerify.rows[0].count} records`);

      // Show sample
      const empSample = await renderClient.query(
        'SELECT employeeid, firstname, lastname FROM employeemaster ORDER BY employeeid DESC LIMIT 1'
      );
      if (empSample.rows.length > 0) {
        const emp = empSample.rows[0];
        console.log(`\nLatest employee migrated:`);
        console.log(`  ID: ${emp.employeeid}`);
        console.log(`  Name: ${emp.firstname} ${emp.lastname}`);
      }

      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║  ✅ EMPLOYEE DATA MIGRATION SUCCESSFUL!               ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');

      process.exit(0);
    } catch (err) {
      console.error('\n❌ Migration error:', err.message);
      process.exit(1);
    } finally {
      await localClient.release();
      await renderClient.release();
      await localPool.end();
      await renderPool.end();
    }
  } catch (err) {
    console.error('\n❌ Connection error:', err.message);
    process.exit(1);
  }
}

migrateEmployeeData();
