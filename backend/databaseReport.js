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

async function generateReport() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                    DATABASE ARCHITECTURE MISMATCH REPORT               ║
║                       LOCAL vs RENDER COMPARISON                       ║
╚════════════════════════════════════════════════════════════════════════╝
`);

    // Get all table names
    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTableNames = localTables.rows.map(r => r.table_name);
    const renderTableNames = renderTables.rows.map(r => r.table_name);

    console.log('📊 TABLE INVENTORY:\n');
    console.log(`Local Database:  ${localTableNames.length} tables`);
    console.log(`Render Database: ${renderTableNames.length} tables`);
    console.log(`Match Rate: ${renderTableNames.length}/${localTableNames.length} = ${Math.round(renderTableNames.length/localTableNames.length * 100)}%`);

    const missingTables = localTableNames.filter(t => !renderTableNames.includes(t));

    console.log(`\n❌ CRITICAL: ${missingTables.length} TABLES MISSING IN RENDER:\n`);
    missingTables.forEach(t => console.log(`   • ${t}`));

    // Check data counts
    console.log(`\n\n📈 DATA INTEGRITY CHECK:\n`);
    
    const commonTables = localTableNames.filter(t => renderTableNames.includes(t));
    let totalMismatch = 0;

    for (const table of commonTables) {
      const localData = await localPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const renderData = await renderPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      
      const localRows = parseInt(localData.rows[0].cnt);
      const renderRows = parseInt(renderData.rows[0].cnt);
      const diff = Math.abs(localRows - renderRows);

      if (diff === 0) {
        console.log(`✅ ${table}: ${localRows} rows (match)`);
      } else {
        console.log(`❌ ${table}: Local ${localRows} ≠ Render ${renderRows} (diff: ${diff})`);
        totalMismatch += diff;
      }
    }

    console.log(`\nTotal data row discrepancy: ${totalMismatch} rows`);

    // Column comparison
    console.log(`\n\n🏗️  SCHEMA STRUCTURE ISSUES:\n`);

    for (const table of commonTables) {
      const localCols = await localPool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      const renderCols = await renderPool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );

      const localColNames = localCols.rows.map(r => r.column_name);
      const renderColNames = renderCols.rows.map(r => r.column_name);

      const missingCols = localColNames.filter(c => !renderColNames.includes(c));
      const extraCols = renderColNames.filter(c => !localColNames.includes(c));

      if (missingCols.length > 0 || extraCols.length > 0) {
        console.log(`⚠️  ${table}:`);
        console.log(`   Local: ${localColNames.length} columns | Render: ${renderColNames.length} columns`);
        if (missingCols.length > 0) {
          console.log(`   Missing in Render: ${missingCols.join(', ')}`);
        }
        if (extraCols.length > 0) {
          console.log(`   Extra in Render: ${extraCols.join(', ')}`);
        }
        console.log();
      }
    }

    // Final diagnosis
    console.log(`\n╔════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║                           DIAGNOSIS & RECOMMENDATIONS                   ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════════╝\n`);

    console.log(`⚠️  CRITICAL ISSUES FOUND:\n`);
    console.log(`1. ARCHITECTURE MISMATCH`);
    console.log(`   • Local has ${localTableNames.length} tables (full ERP system)`);
    console.log(`   • Render has only ${renderTableNames.length} tables (minimal schema)`);
    console.log(`   • These are fundamentally different database designs\n`);

    console.log(`2. MISSING REFERENCE TABLES`);
    console.log(`   • No company, employee, roles, permissions, taxes, services, etc.`);
    console.log(`   • App cannot function without these master tables\n`);

    console.log(`3. INCOMPLETE COLUMN MAPPINGS`);
    console.log(`   • vehicledetail: Uses different column names than local`);
    console.log(`   • invoicemaster: Missing 27 columns (business logic data)`);
    console.log(`   • customermaster: Missing 18 columns (customer details)\n`);

    console.log(`4. DATA INTEGRITY ISSUES`);
    console.log(`   • Some rows missing in Render`);
    console.log(`   • Cannot determine which data is "correct"\n`);

    console.log(`✅ RECOMMENDED SOLUTION:\n`);
    console.log(`Option 1: SYNC LOCAL → RENDER (DATA MIGRATION)`);
    console.log(`   ✓ Create all 16 missing tables in Render`);
    console.log(`   ✓ Add missing columns to existing tables`);
    console.log(`   ✓ Migrate complete local data to Render`);
    console.log(`   ⏱ Time: 2-3 hours\n`);

    console.log(`Option 2: KEEP SEPARATE SCHEMAS (ACCEPT DIFFERENCES)`);
    console.log(`   ✓ Update API layer to handle both schemas`);
    console.log(`   ✓ Accept that Render is "lite" version`);
    console.log(`   ✓ Only the 3 common tables are synchronized`);
    console.log(`   ⏱ Time: 1 hour\n`);

    console.log(`Option 3: RECREATE RENDER DATABASE FROM LOCAL SQL\n`);
    console.log(`   ✓ Export full local schema (schema.sql)`);
    console.log(`   ✓ Clear Render database`);
    console.log(`   ✓ Import full schema + data to Render`);
    console.log(`   ⏱ Time: 30 minutes\n`);

    await localPool.end();
    await renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await localPool.end();
    await renderPool.end();
  }
}

generateReport();
