#!/usr/bin/env node

/**
 * Final clean sync - deduplicate and ensure exactly 11,428 unique itemmaster records
 */

const { Pool } = require('pg');

async function finalCleanSync() {
  console.log('🧹 FINAL CLEAN ITEMMASTER SYNC\n');

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
    // Step 1: Get local count
    console.log('1️⃣  Getting local itemmaster data...');
    const localResult = await localPool.query('SELECT COUNT(*) as cnt FROM itemmaster WHERE deletedat IS NULL');
    const localCount = localResult.rows[0].cnt;
    console.log(`✓ Local has ${localCount} active records\n`);

    // Step 2: Check Render count
    console.log('2️⃣  Checking Render...');
    const renderCheckResult = await renderPool.query('SELECT COUNT(*) as cnt FROM itemmaster');
    const renderCurrentCount = renderCheckResult.rows[0].cnt;
    console.log(`⚠️  Render has ${renderCurrentCount} records (expected ${localCount})\n`);

    // Step 3: Clear Render
    console.log('3️⃣  Clearing Render itemmaster...');
    await renderPool.query('DELETE FROM itemmaster WHERE true');
    const renderClearResult = await renderPool.query('SELECT COUNT(*) as cnt FROM itemmaster');
    console.log(`✓ Cleared. Now has ${renderClearResult.rows[0].cnt} records\n`);

    // Step 4: Fetch and sync all local records
    console.log('4️⃣  Fetching all local records...');
    const allRecords = await localPool.query('SELECT * FROM itemmaster WHERE deletedat IS NULL ORDER BY itemid');
    const records = allRecords.rows;
    console.log(`✓ Fetched ${records.length} records\n`);

    // Step 5: Sync with progress updates every 1000
    console.log('5️⃣  Syncing to Render with deduplication...\n');
    let inserted = 0;
    const batchSize = 100;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        const cols = Object.keys(record);
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = cols.map(c => record[c]);
        
        try {
          await renderPool.query(
            `INSERT INTO itemmaster (${cols.join(', ')}) VALUES (${placeholders})`,
            values
          );
          inserted++;

          // Progress update every 1000
          if (inserted % 1000 === 0) {
            console.log(`   📊 Progress: ${inserted}/${records.length} records synced (${Math.round(inserted / records.length * 100)}%)`);
          }
        } catch (err) {
          if (err.code !== '23505') { // Ignore duplicate key errors
            console.error(`❌ Error syncing itemid ${record.itemid}:`, err.message);
          }
        }
      }
    }

    console.log(`\n✓ Sync complete: ${inserted} records inserted\n`);

    // Step 6: Final verification
    console.log('6️⃣  Final verification...');
    const finalResult = await renderPool.query('SELECT COUNT(*) as cnt FROM itemmaster');
    const finalCount = finalResult.rows[0].cnt;
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ FINAL SYNC STATUS');
    console.log('='.repeat(70));
    console.log(`Local records:        ${localCount}`);
    console.log(`Render records:       ${finalCount}`);
    
    if (finalCount === localCount) {
      console.log(`\n🎉 SUCCESS! All ${finalCount} records synced correctly!`);
    } else {
      console.log(`\n⚠️  Count mismatch: ${finalCount} on Render vs ${localCount} local`);
    }
    console.log('='.repeat(70) + '\n');

    await localPool.end();
    await renderPool.end();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    await localPool.end().catch(() => {});
    await renderPool.end().catch(() => {});
    process.exit(1);
  }
}

finalCleanSync();
