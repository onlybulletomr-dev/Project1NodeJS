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

async function finalStatus() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║          FINAL DATABASE SYNC STATUS: LOCAL vs RENDER                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

    // Get tables
    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = localTables.rows.map(r => r.table_name);
    const renderTableNames = renderTables.rows.map(r => r.table_name);

    console.log(`📊 TABLE STATUS:\n`);
    console.log(`  Local:  ${localTableNames.length} tables`);
    console.log(`  Render: ${renderTableNames.length} tables`);
    console.log(`  Match:  ${Math.round(renderTableNames.length / localTableNames.length * 100)}%\n`);

    // Data comparison
    console.log(`📈 DATA SYNCED:\n`);

    let totalLocalRows = 0;
    let totalRenderRows = 0;
    const commonTables = [];

    for (const table of localTableNames) {
      if (renderTableNames.includes(table)) {
        commonTables.push(table);
        const localCount = await localPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        const renderCount = await renderPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        const localRows = parseInt(localCount.rows[0].cnt);
        const renderRows = parseInt(renderCount.rows[0].cnt);
        totalLocalRows += localRows;
        totalRenderRows += renderRows;

        const status = localRows === renderRows ? '✅' : '❌';
        console.log(`  ${status} ${table}: ${renderRows}/${localRows} rows`);
      }
    }

    const missingTables = localTableNames.filter(t => !renderTableNames.includes(t));

    console.log(`\n🔴 STILL MISSING IN RENDER (${missingTables.length}):\n`);
    missingTables.forEach(t => console.log(`  • ${t}`));

    console.log(`\n╔════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║                         SUMMARY                                       ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════════╝\n`);

    console.log(`✅ Tables synced: ${commonTables.length}/${localTableNames.length} (${Math.round(commonTables.length/localTableNames.length * 100)}%)`);
    console.log(`✅ Data synced: ${totalRenderRows}/${totalLocalRows} rows (${Math.round(totalRenderRows/totalLocalRows * 100)}%)`);
    console.log(`❌ Tables missing: ${missingTables.length}`);

    if (missingTables.length === 0) {
      console.log(`\n🎉 SUCCESS: Render database fully synchronized with local!\n`);
    } else {
      console.log(`\n⚠️  ACTION: ${missingTables.length} tables still need to be recreated (sequence issues)\n`);
      console.log(`NEXT STEP: These tables have auto-increment sequences that need special handling:`);
      console.log(`Run: node fixSequencesAndRecreate.js\n`);
    }

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

finalStatus();
