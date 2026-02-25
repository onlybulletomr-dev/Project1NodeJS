const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'project1db',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

const log = [];
const addLog = (msg) => {
  console.log(msg);
  log.push(msg);
};

async function runCleanupAndReport() {
  try {
    addLog('\n========== STARTING CLEANUP AND CREATION ==========\n');

    // STEP 1: Clean up duplicates
    addLog('STEP 1: Removing duplicate rows...\n');

    const tablesToClean = [
      { table: 'companymaster', pk: 'companyid' },
      { table: 'customermaster', pk: 'customerid' },
      { table: 'invoicedetail', pk: 'invoicedetailid' }
    ];

    for (const { table, pk } of tablesToClean) {
      try {
        const rows = await renderPool.query(`SELECT * FROM "${table}"`);
        const seen = new Set();
        let duplicates = 0;

        rows.rows.forEach(row => {
          const id = row[pk];
          if (seen.has(id)) {
            duplicates++;
          } else {
            seen.add(id);
          }
        });

        if (duplicates > 0) {
          const deleteSQL = `DELETE FROM "${table}" WHERE "${pk}" IN (
            SELECT "${pk}" FROM (
              SELECT "${pk}", ROW_NUMBER() OVER (PARTITION BY "${pk}" ORDER BY "${pk}") as rn
              FROM "${table}"
            ) t WHERE rn > 1
          )`;
          
          await renderPool.query(deleteSQL);
          addLog(`✓ ${table}: Removed ${duplicates} duplicate(s)`);
        } else {
          addLog(`✓ ${table}: No duplicates (${rows.rows.length} rows)`);
        }
      } catch (err) {
        addLog(`✗ ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    // STEP 2: Get all tables
    addLog('\nSTEP 2: Identifying missing tables...\n');

    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = localTables.rows.map(r => r.table_name);
    const renderTableNames = renderTables.rows.map(r => r.table_name);
    const missingTables = localTableNames.filter(t => !renderTableNames.includes(t));

    addLog(`Local has ${localTableNames.length} tables, Render has ${renderTableNames.length}`);
    addLog(`Missing tables (${missingTables.length}): ${missingTables.join(', ')}\n`);

    // STEP 3: Create missing tables
    addLog(`STEP 3: Creating ${missingTables.length} missing tables...\n`);

    for (const table of missingTables) {
      try {
        const columns = await localPool.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position`,
          [table]
        );

        const colDefs = columns.rows.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          return def;
        }).join(', ');

        const createStmt = `CREATE TABLE IF NOT EXISTS "${table}" (${colDefs})`;
        await renderPool.query(createStmt);
        addLog(`✓ Created: ${table}`);

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
              // Skip
            }
          }

          addLog(`  → Migrated: ${inserted}/${rowCount} rows`);
        } else {
          addLog(`  → Table is empty`);
        }
      } catch (err) {
        addLog(`✗ ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    // STEP 4: Final status check
    addLog('\n========== FINAL STATUS CHECK ==========\n');

    const finalLocal = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const finalRender = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const finalLocalNames = finalLocal.rows.map(r => r.table_name);
    const finalRenderNames = finalRender.rows.map(r => r.table_name);
    const stillMissing = finalLocalNames.filter(t => !finalRenderNames.includes(t));

    addLog(`Local: ${finalLocalNames.length} tables`);
    addLog(`Render: ${finalRenderNames.length} tables`);
    addLog(`Sync: ${Math.round(finalRenderNames.length / finalLocalNames.length * 100)}%\n`);

    if (stillMissing.length === 0) {
      addLog('✅ SUCCESS: All tables are now present in Render database!\n');
    } else {
      addLog(`⚠️  Still missing (${stilllMissing.length}): ${stillMissing.join(', ')}\n`);
    }

    // Write results to file
    fs.writeFileSync('cleanup_report.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      status: stillMissing.length === 0 ? 'SUCCESS' : 'PARTIAL',
      tables: {
        local: finalLocalNames.length,
        render: finalRenderNames.length,
        missing: stillMissing.length,
        missingNames: stillMissing
      },
      log: log
    }, null, 2));

    addLog('\n✅ Report written to cleanup_report.json');

    await localPool.end();
    await renderPool.end();
    process.exit(0);
  } catch (err) {
    addLog(`\n❌ FATAL ERROR: ${err.message}`);
    addLog(err.stack);
    
    fs.writeFileSync('cleanup_report.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      error: err.message,
      log: log
    }, null, 2));

    await localPool.end();
    await renderPool.end();
    process.exit(1);
  }
}

runCleanupAndReport();
