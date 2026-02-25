const { Pool } = require('pg');
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

async function cleanupAndComplete() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     CLEANUP DUPLICATES & CREATE REMAINING TABLES              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // STEP 1: Clean up duplicates
    console.log('STEP 1: Removing duplicate rows from existing tables...\n');

    const tablesToClean = [
      { table: 'companymaster', pk: 'companyid' },
      { table: 'customermaster', pk: 'customerid' },
      { table: 'invoicedetail', pk: 'invoicedetailid' }
    ];

    for (const { table, pk } of tablesToClean) {
      try {
        // Get all rows, deduplicate by primary key
        const rows = await renderPool.query(`SELECT * FROM "${table}"`);
        const seen = new Set();
        const duplicates = [];

        rows.rows.forEach(row => {
          const id = row[pk];
          if (seen.has(id)) {
            duplicates.push(id);
          } else {
            seen.add(id);
          }
        });

        if (duplicates.length > 0) {
          // Delete duplicates (keep only first occurrence)
          const deleteSQL = `DELETE FROM "${table}" WHERE "${pk}" IN (
            SELECT "${pk}" FROM (
              SELECT "${pk}", ROW_NUMBER() OVER (PARTITION BY "${pk}" ORDER BY "${pk}") as rn
              FROM "${table}"
            ) t WHERE rn > 1
          )`;
          
          await renderPool.query(deleteSQL);
          console.log(`✅ ${table}: Removed ${duplicates.length} duplicate(s)`);
        } else {
          console.log(`✅ ${table}: No duplicates found`);
        }
      } catch (err) {
        console.log(`⚠️  ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    // STEP 2: Get all local tables
    console.log('\nSTEP 2: Identifying tables to create...\n');

    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = localTables.rows.map(r => r.table_name);
    const renderTableNames = renderTables.rows.map(r => r.table_name);
    const missingTables = localTableNames.filter(t => !renderTableNames.includes(t));

    console.log(`Found ${missingTables.length} missing tables:`);
    missingTables.forEach(t => console.log(`  • ${t}`));

    // STEP 3: Create missing tables
    console.log(`\nSTEP 3: Creating ${missingTables.length} missing tables...\n`);

    for (const table of missingTables) {
      try {
        // Get column definitions
        const columns = await localPool.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position`,
          [table]
        );

        // Build CREATE TABLE
        const colDefs = columns.rows.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          return def;
        }).join(',\n  ');

        const createStmt = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs}\n)`;
        await renderPool.query(createStmt);
        console.log(`✅ Created: ${table}`);

        // Migrate data
        const data = await localPool.query(`SELECT * FROM "${table}"`);
        const rowCount = data.rows.length;

        if (rowCount > 0) {
          const cols = Object.keys(data.rows[0]);
          let inserted = 0;

          for (const row of data.rows) {
            const values = cols.map(c => row[c]);
            const $params = cols.map((_, i) => `$${i + 1}`).join(', ');
            const insertSQL = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${$params}) ON CONFLICT DO NOTHING`;
            
            try {
              const result = await renderPool.query(insertSQL, values);
              if (result.rowCount > 0) inserted++;
            } catch (e) {
              // Skip on error
            }
          }

          console.log(`  📊 Migrated: ${inserted}/${rowCount} rows`);
        } else {
          console.log(`  📊 Table is empty (0 rows)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║               ✅ CLEANUP & CREATION COMPLETE!                  ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Fatal error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

cleanupAndComplete();
