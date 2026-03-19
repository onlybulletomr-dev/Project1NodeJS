#!/usr/bin/env node

/**
 * Comprehensive schema comparison between local and Render databases
 * Checks ALL tables for column differences
 */

const { Pool } = require('pg');

async function compareAllSchemas() {
  console.log('🔍 COMPREHENSIVE SCHEMA COMPARISON\n');
  console.log('═'.repeat(80) + '\n');

  const localPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'Project1db',
    user: 'postgres',
    password: 'admin',
    ssl: false
  });

  const renderPool = new Pool({
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get all tables from local database
    console.log('📋 Fetching table names from local...\n');
    const localTablesResult = await localPool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    const localTables = localTablesResult.rows.map(r => r.tablename);
    console.log(`✓ Found ${localTables.length} tables in local database\n`);

    // Get all tables from Render
    console.log('📋 Fetching table names from Render...\n');
    const renderTablesResult = await renderPool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    const renderTables = renderTablesResult.rows.map(r => r.tablename);
    console.log(`✓ Found ${renderTables.length} tables in Render database\n`);

    // Find table differences
    const missingInRender = localTables.filter(t => !renderTables.includes(t));
    const extraInRender = renderTables.filter(t => !localTables.includes(t));

    if (missingInRender.length > 0) {
      console.log('⚠️  MISSING TABLES IN RENDER:');
      missingInRender.forEach(t => console.log(`   - ${t}`));
      console.log();
    }

    if (extraInRender.length > 0) {
      console.log('ℹ️  EXTRA TABLES IN RENDER:');
      extraInRender.forEach(t => console.log(`   - ${t}`));
      console.log();
    }

    // Check column schemas for common tables
    const commonTables = localTables.filter(t => renderTables.includes(t));
    console.log(`\n📊 CHECKING COLUMN SYNC FOR ${commonTables.length} COMMON TABLES\n`);
    console.log('═'.repeat(80) + '\n');

    const syncStatus = [];
    let allInSync = true;

    for (const tableName of commonTables) {
      // Get columns from local
      const localColsResult = await localPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      // Get columns from Render
      const renderColsResult = await renderPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      const localCols = localColsResult.rows;
      const renderCols = renderColsResult.rows;
      
      const localColMap = new Map(localCols.map(c => [c.column_name, c]));
      const renderColMap = new Map(renderCols.map(c => [c.column_name, c]));

      // Find missing and extra columns
      const missingCols = Array.from(localColMap.keys()).filter(c => !renderColMap.has(c));
      const extraCols = Array.from(renderColMap.keys()).filter(c => !localColMap.has(c));
      
      // Check for type differences in common columns
      const typeDiffs = [];
      for (const colName of localColMap.keys()) {
        if (renderColMap.has(colName)) {
          const localCol = localColMap.get(colName);
          const renderCol = renderColMap.get(colName);
          if (localCol.data_type !== renderCol.data_type) {
            typeDiffs.push({
              column: colName,
              local: localCol.data_type,
              render: renderCol.data_type
            });
          }
        }
      }

      const isInSync = missingCols.length === 0 && extraCols.length === 0 && typeDiffs.length === 0;

      if (!isInSync) {
        allInSync = false;
      }

      syncStatus.push({
        table: tableName,
        localCols: localCols.length,
        renderCols: renderCols.length,
        missing: missingCols,
        extra: extraCols,
        typeDiffs: typeDiffs,
        inSync: isInSync
      });
    }

    // Display results
    for (const status of syncStatus) {
      const icon = status.inSync ? '✅' : '⚠️';
      console.log(`${icon} ${status.table}`);
      console.log(`   Local columns: ${status.localCols}, Render columns: ${status.renderCols}`);

      if (status.missing.length > 0) {
        console.log(`   ❌ Missing in Render:`);
        status.missing.forEach(col => console.log(`      - ${col}`));
      }

      if (status.extra.length > 0) {
        console.log(`   ℹ️  Extra in Render:`);
        status.extra.forEach(col => console.log(`      - ${col}`));
      }

      if (status.typeDiffs.length > 0) {
        console.log(`   ⚠️  Type differences:`);
        status.typeDiffs.forEach(diff => {
          console.log(`      - ${diff.column}: local=${diff.local}, render=${diff.render}`);
        });
      }

      console.log();
    }

    // Summary
    console.log('═'.repeat(80));
    console.log('\n📈 SUMMARY\n');
    
    const inSyncTables = syncStatus.filter(s => s.inSync).length;
    const outOfSyncTables = syncStatus.filter(s => !s.inSync).length;

    console.log(`✅ In Sync:     ${inSyncTables}/${commonTables.length} tables`);
    console.log(`⚠️  Out of Sync: ${outOfSyncTables}/${commonTables.length} tables`);

    if (allInSync) {
      console.log('\n🎉 ALL TABLES ARE IN SYNC!\n');
    } else {
      console.log('\n📋 Out of sync tables need attention:\n');
      syncStatus.filter(s => !s.inSync).forEach(s => {
        console.log(`   • ${s.table}`);
        if (s.missing.length > 0) console.log(`     - Missing: ${s.missing.join(', ')}`);
        if (s.extra.length > 0) console.log(`     - Extra: ${s.extra.join(', ')}`);
        if (s.typeDiffs.length > 0) {
          const diffs = s.typeDiffs.map(d => `${d.column}(${d.local}→${d.render})`).join(', ');
          console.log(`     - Type diffs: ${diffs}`);
        }
      });
      console.log();
    }

    await localPool.end();
    await renderPool.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await localPool.end().catch(() => {});
    await renderPool.end().catch(() => {});
    process.exit(1);
  }
}

compareAllSchemas();
