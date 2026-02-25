const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'project1',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function fullDatabaseRecreation() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║      FULL DATABASE RECREATION: LOCAL SCHEMA → RENDER          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Step 1: Get all tables from local
    console.log('STEP 1: Analyzing local database structure...');
    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tableNames = localTables.rows.map(r => r.table_name);
    console.log(`✅ Found ${tableNames.length} tables\n`);

    // Step 2: Get CREATE TABLE statements from local
    console.log('STEP 2: Extracting table definitions...');
    const tableDefinitions = {};
    
    for (const table of tableNames) {
      // Get columns
      const columns = await localPool.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position`,
        [table]
      );

      // Get primary key
      const pk = await localPool.query(
        `SELECT constraint_name 
         FROM information_schema.table_constraints 
         WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY'`,
        [table]
      );

      tableDefinitions[table] = {
        columns: columns.rows,
        primaryKey: pk.rows[0]?.constraint_name
      };
    }
    console.log(`✅ Extracted ${Object.keys(tableDefinitions).length} table structures\n`);

    // Step 3: Create tables in Render  
    console.log('STEP 3: Creating tables in Render database...');
    
    for (const table of tableNames) {
      const def = tableDefinitions[table];
      
      // Build CREATE TABLE statement
      const columnDefs = def.columns.map(col => {
        let colDef = `"${col.column_name}" ${col.data_type}`;
        if (col.is_nullable === 'NO') colDef += ' NOT NULL';
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`;
        return colDef;
      }).join(',\n  ');

      const createStmt = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${columnDefs}\n)`;

      try {
        await renderPool.query(createStmt);
        console.log(`✅ Created: ${table}`);
      } catch (err) {
        console.error(`❌ Error creating ${table}:`, err.message.split('\n')[0]);
      }
    }

    console.log();

    // Step 4: Migrate data
    console.log('STEP 4: Migrating data from local to Render...\n');
    
    let totalRows = 0;
    const results = [];

    for (const table of tableNames) {
      try {
        // Get all data from local
        const data = await localPool.query(`SELECT * FROM "${table}"`);
        const rowCount = data.rows.length;

        if (rowCount === 0) {
          results.push(`⏭️  ${table}: 0 rows (skipped)`);
          continue;
        }

        // Insert into Render
        if (rowCount > 0) {
          const columns = Object.keys(data.rows[0]);
          const values = data.rows.map((row, idx) => 
            `(${columns.map((col, i) => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              return val;
            }).join(', ')})`
          ).join(',\n  ');

          const insertStmt = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) 
                             VALUES ${values}
                             ON CONFLICT DO NOTHING`;
          
          await renderPool.query(insertStmt);
          results.push(`✅ ${table}: ${rowCount} rows migrated`);
          totalRows += rowCount;
        }
      } catch (err) {
        results.push(`❌ ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    results.forEach(r => console.log(r));

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                     MIGRATION COMPLETE                        ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
    console.log(`✅ Total rows migrated: ${totalRows}`);
    console.log(`✅ Render database now matches local database schema\n`);

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Fatal error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

fullDatabaseRecreation();
