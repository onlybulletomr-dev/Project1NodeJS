#!/usr/bin/env node

/**
 * Robust itemmaster sync with batch processing and error recovery
 */

const { Pool } = require('pg');

async function syncItemMasterRobust() {
  console.log('🚀 ITEMMASTER SYNC TO RENDER (Robust Version)\n');

  const localPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Project1db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  const createRenderPool = () => new Pool({
    host: process.env.RENDER_DB_HOST || 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: process.env.RENDER_DB_PORT || 5432,
    database: process.env.RENDER_DB_NAME || 'project1db_nrlz',
    user: process.env.RENDER_DB_USER || 'postgres1',
    password: process.env.RENDER_DB_PASSWORD || 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    ssl: { rejectUnauthorized: false },
    max: 2,  // Smaller max for Render
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 5000
  });

  let renderPool = createRenderPool();

  try {
    console.log('1️⃣  Getting local itemmaster data...');
    const localResult = await localPool.query(`
      SELECT * FROM itemmaster WHERE deletedat IS NULL ORDER BY itemid
    `);
    
    const records = localResult.rows;
    console.log(`✓ Found ${records.length} total records\n`);

    // Clear Render
    console.log('2️⃣  Clearing Render itemmaster...');
    await renderPool.query('DELETE FROM itemmaster WHERE true');
    console.log('✓ Cleared\n');

    // Sync in batches of 50
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    console.log('3️⃣  Syncing in batches of ' + BATCH_SIZE + '...\n');

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);

      console.log(`   Batch ${batchNum}/${totalBatches} (records ${i + 1}-${Math.min(i + BATCH_SIZE, records.length)})`);

      for (const record of batch) {
        try {
          // Build dynamic INSERT with all columns
          const cols = Object.keys(record);
          const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
          const values = cols.map(c => record[c]);

          const insertSql = `INSERT INTO itemmaster (${cols.join(', ')}) VALUES (${placeholders})`;

          await renderPool.query(insertSql, values);
          successCount++;
          
        } catch (err) {
          // Handle connection errors by reconnecting
          if (err.code === 'ECONNREFUSED' || err.message.includes('Connection terminated') || err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log(`\n   ♻️  Reconnecting to Render...`);
            await renderPool.end().catch(() => {});
            renderPool = createRenderPool();
            
            // Retry the record
            try {
              const cols = Object.keys(record);
              const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
              const values = cols.map(c => record[c]);
              const insertSql = `INSERT INTO itemmaster (${cols.join(', ')}) VALUES (${placeholders})`;
              
              await renderPool.query(insertSql, values);
              successCount++;
            } catch (retryErr) {
              errorCount++;
              console.error(`   ❌ Failed to sync itemid ${record.itemid} (after retry): ${retryErr.message}`);
            }
          } else if (err.code === '23505') {
            // Duplicate key - skip
            console.log(`   ⊘ Duplicate key for itemid ${record.itemid}, skipping`);
          } else {
            errorCount++;
            console.error(`   ❌ Error syncing itemid ${record.itemid}: ${err.message}`);
          }
        }
      }
      
      console.log(`   ✓ Batch ${batchNum} complete (synced: ${successCount}/${i + BATCH_SIZE})\n`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SYNC COMPLETE');
    console.log(`   ✓ Successfully synced: ${successCount} records`);
    console.log(`   ❌ Failed: ${errorCount} records`);
    console.log('='.repeat(70));

    // Final verification
    console.log('\n4️⃣  Final verification...');
    const verifyResult = await renderPool.query('SELECT COUNT(*) as cnt FROM itemmaster WHERE deletedat IS NULL');
    console.log(`✓ Render itemmaster now has: ${verifyResult.rows[0].cnt} records`);

    console.log('\n✨ Migration complete!');
    await localPool.end();
    await renderPool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error);
    await localPool.end().catch(() => {});
    await renderPool.end().catch(() => {});
    process.exit(1);
  }
}

syncItemMasterRobust();
