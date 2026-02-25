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

async function detailedComparison() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         DETAILED TABLE STRUCTURE ANALYSIS                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Check critical tables
    const tablesToCheck = ['customermaster', 'invoicemaster', 'vehicledetail'];

    for (const table of tablesToCheck) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`TABLE: ${table.toUpperCase()}`);
      console.log('═'.repeat(60));

      const localCols = await localPool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      const renderCols = await renderPool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );

      const localColMap = {};
      localCols.rows.forEach(r => localColMap[r.column_name] = r.data_type);

      const renderColMap = {};
      renderCols.rows.forEach(r => renderColMap[r.column_name] = r.data_type);

      console.log(`\nLocal: ${localCols.rows.length} columns | Render: ${renderCols.rows.length} columns`);

      // Show all local columns
      console.log('\n📍 LOCAL COLUMNS:');
      localCols.rows.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.column_name}: ${r.data_type}`);
      });

      console.log('\n📍 RENDER COLUMNS:');
      renderCols.rows.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.column_name}: ${r.data_type}`);
      });

      // Find differences
      const missingInRender = localCols.rows.filter(r => !renderColMap[r.column_name]);
      const extraInRender = renderCols.rows.filter(r => !localColMap[r.column_name]);

      if (missingInRender.length > 0) {
        console.log(`\n❌ MISSING IN RENDER (${missingInRender.length}):`);
        missingInRender.forEach(r => console.log(`  • ${r.column_name}: ${r.data_type}`));
      }

      if (extraInRender.length > 0) {
        console.log(`\n⚠️  EXTRA IN RENDER (${extraInRender.length}):`);
        extraInRender.forEach(r => console.log(`  • ${r.column_name}: ${r.data_type}`));
      }

      // Get row info
      const localData = await localPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const renderData = await renderPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      console.log(`\n📊 DATA: Local ${localData.rows[0].cnt} rows | Render ${renderData.rows[0].cnt} rows`);
    }

    // Show missing tables
    console.log(`\n\n${'═'.repeat(60)}`);
    console.log('MISSING TABLES IN RENDER');
    console.log('═'.repeat(60));

    const allLocalTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const allRenderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = allLocalTables.rows.map(r => r.table_name);
    const renderTableNames = allRenderTables.rows.map(r => r.table_name);
    const missing = localTableNames.filter(t => !renderTableNames.includes(t));

    console.log(`\nTotal missing: ${missing.length} tables\n`);
    missing.forEach(t => console.log(`  ❌ ${t}`));

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

detailedComparison();
