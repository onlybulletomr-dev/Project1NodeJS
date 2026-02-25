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

async function compareDatabase() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           DATABASE COMPARISON: LOCAL vs RENDER                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get table names from both databases
    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = localTables.rows.map(r => r.table_name).sort();
    const renderTableNames = renderTables.rows.map(r => r.table_name).sort();

    console.log('═══ TABLE NAMES ═══\n');
    console.log(`Local tables (${localTableNames.length}):`, localTableNames.join(', '));
    console.log(`Render tables (${renderTableNames.length}):`, renderTableNames.join(', '));

    // Check for missing tables
    const missingInRender = localTableNames.filter(t => !renderTableNames.includes(t));
    const extraInRender = renderTableNames.filter(t => !localTableNames.includes(t));

    if (missingInRender.length > 0) {
      console.log(`\n⚠️  Missing in Render: ${missingInRender.join(', ')}`);
    }
    if (extraInRender.length > 0) {
      console.log(`\n⚠️  Extra in Render: ${extraInRender.join(', ')}`);
    }

    const commonTables = localTableNames.filter(t => renderTableNames.includes(t));
    if (missingInRender.length === 0 && extraInRender.length === 0) {
      console.log('\n✅ All table names match!\n');
    }

    // Compare structures and data for common tables
    console.log('\n═══ TABLE STRUCTURE COMPARISON ═══\n');

    for (const table of commonTables) {
      // Get column info
      const localCols = await localPool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      const renderCols = await renderPool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );

      const localColNames = localCols.rows.map(r => `${r.column_name}(${r.data_type})`);
      const renderColNames = renderCols.rows.map(r => `${r.column_name}(${r.data_type})`);

      // Check structure match
      const structureMatch = JSON.stringify(localColNames) === JSON.stringify(renderColNames);
      
      // Get row counts
      const localCount = await localPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const renderCount = await renderPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      
      const localRows = parseInt(localCount.rows[0].cnt);
      const renderRows = parseInt(renderCount.rows[0].cnt);
      const rowsMatch = localRows === renderRows;

      // Display results
      const structureIcon = structureMatch ? '✅' : '❌';
      const rowsIcon = rowsMatch ? '✅' : '❌';

      console.log(`Table: ${table}`);
      console.log(`  Structure: ${structureIcon} ${structureMatch ? 'Match' : 'MISMATCH'}`);
      if (!structureMatch) {
        console.log(`    Local cols (${localColNames.length}):`, localColNames.slice(0, 3).join(', ') + (localColNames.length > 3 ? '...' : ''));
        console.log(`    Render cols (${renderColNames.length}):`, renderColNames.slice(0, 3).join(', ') + (renderColNames.length > 3 ? '...' : ''));
      }
      console.log(`  Data: ${rowsIcon} Local: ${localRows} rows, Render: ${renderRows} rows`);
      if (!rowsMatch) {
        console.log(`    ⚠️  Difference: ${Math.abs(localRows - renderRows)} rows`);
      }
      console.log();
    }

    // Summary
    console.log('═══ SUMMARY ═══\n');
    const structureMatches = commonTables.filter(async table => {
      const localCols = await localPool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      const renderCols = await renderPool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      return JSON.stringify(localCols.rows) === JSON.stringify(renderCols.rows);
    });

    console.log(`✅ Tables present in both: ${commonTables.length}`);
    console.log(`⚠️  Missing in Render: ${missingInRender.length}`);
    console.log(`⚠️  Extra in Render: ${extraInRender.length}`);
    
    if (missingInRender.length === 0 && extraInRender.length === 0) {
      console.log('\n🎉 READY FOR PRODUCTION: All tables match!\n');
    } else {
      console.log('\n⚠️  ACTION REQUIRED: Create missing tables or review extra tables\n');
    }

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

compareDatabase();
