#!/usr/bin/env node

/**
 * Simple itemmaster sync from local to Render
 * Handles existing records and missing columns
 */

const { Pool } = require('pg');

async function syncItemMaster() {
  console.log('🚀 ITEMMASTER SYNC TO RENDER\n');

  const localPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Project1db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    ssl: false
  });

  const renderPool = new Pool({
    host: process.env.RENDER_DB_HOST || 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: process.env.RENDER_DB_PORT || 5432,
    database: process.env.RENDER_DB_NAME || 'project1db_nrlz',
    user: process.env.RENDER_DB_USER || 'postgres1',
    password: process.env.RENDER_DB_PASSWORD || 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('1️⃣  Getting local itemmaster data...');
    const localResult = await localPool.query(`
      SELECT * FROM itemmaster WHERE deletedat IS NULL ORDER BY itemid
    `);
    
    const records = localResult.rows;
    console.log(`✓ Found ${records.length} records\n`);

    if (records.length === 0) {
      console.log('No records to sync');
      return;
    }

    // Get Render table structure
    console.log('2️⃣  Checking Render itemmaster structure...');
    const renderSchemaResult = await renderPool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'itemmaster' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const renderColumns = new Set(renderSchemaResult.rows.map(r => r.column_name));
    console.log(`✓ Render has ${renderSchemaResult.rows.length} columns\n`);

    // Identify matching columns
    const firstRecord = records[0];
    const localColumns = Object.keys(firstRecord);
    const syncColumns = localColumns.filter(col => renderColumns.has(col));
    const missingOnRender = localColumns.filter(col => !renderColumns.has(col));

    console.log(`3️⃣  Column analysis:`);
    console.log(`   ✓ Local columns: ${localColumns.length}`);
    console.log(`   ✓ Render columns: ${renderColumns.size}`);
    console.log(`   ✓ Can sync: ${syncColumns.length}`);
    console.log(`   ⚠️  Missing on Render: ${missingOnRender.length}`);

    if (missingOnRender.length > 0) {
      console.log(`   Columns to add: ${missingOnRender.join(', ')}`);
    }

    // Delete existing records on Render
    console.log('\n4️⃣  Clearing Render itemmaster for fresh sync...');
    await renderPool.query('DELETE FROM itemmaster WHERE true');
    console.log('✓ Cleared\n');

    // Insert records with only columns that exist on Render
    console.log('5️⃣  Syncing records (using matching columns only)...');
    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        // Build dynamic INSERT with only matching columns
        const cols = syncColumns.filter(c => record.hasOwnProperty(c));
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const values = cols.map(c => record[c]);

        const insertSql = `
          INSERT INTO itemmaster (${cols.join(', ')})
          VALUES (${placeholders})
        `;

        await renderPool.query(insertSql, values);
        successCount++;

        if (successCount % 20 === 0) {
          process.stdout.write(`\r   Synced: ${successCount}/${records.length}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`\n   ❌ Error syncing itemid ${record.itemid}: ${err.message}`);
      }
    }

    console.log(`\n✓ Sync complete: ${successCount} success, ${errorCount} errors\n`);

    // Verify
    console.log('6️⃣  Verifying...');
    const verifyResult = await renderPool.query('SELECT COUNT(*) as total FROM itemmaster');
    console.log(`✓ Render itemmaster now has: ${verifyResult.rows[0].total} records`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(60));

    await localPool.end();
    await renderPool.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncItemMaster();
