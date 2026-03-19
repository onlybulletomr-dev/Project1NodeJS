#!/usr/bin/env node

/**
 * Sync Logo Data from Local to Render
 * This script syncs company master logo data from your local database to Render
 * 
 * Usage: 
 *   node syncLogoToRender.js
 */

const pg = require('pg');

// Local database connection (localhost)
const localConfig = {
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || 'postgres',
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: process.env.LOCAL_DB_PORT || 5432,
  database: process.env.LOCAL_DB_NAME || 'project1db'
};

// Render database connection
const renderConfig = {
  connectionString: process.env.DATABASE_URL || process.env.RENDER_DB_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connect_timeout: 10,
  statement_timeout: 30000,
  idle_in_transaction_session_timeout: 30000
};

async function syncLogoData() {
  const localPool = new pg.Pool(localConfig);
  const renderPool = new pg.Pool(renderConfig);

  try {
    console.log('🔄 Starting logo data sync...\n');

    // Step 1: Connect to databases
    console.log('📡 Connecting to databases...');
    
    // Test local connection
    try {
      const localTest = await localPool.query('SELECT 1');
      console.log('✅ Connected to LOCAL database');
    } catch (error) {
      console.error('❌ Failed to connect to LOCAL database');
      console.error('   Make sure your local PostgreSQL is running');
      console.error('   Or set these environment variables:');
      console.error('   - LOCAL_DB_USER');
      console.error('   - LOCAL_DB_PASSWORD');
      console.error('   - LOCAL_DB_HOST');
      console.error('   - LOCAL_DB_PORT');
      console.error('   - LOCAL_DB_NAME');
      throw error;
    }

    // Test Render connection
    try {
      const renderTest = await renderPool.query('SELECT 1');
      console.log('✅ Connected to RENDER database');
    } catch (error) {
      console.error('❌ Failed to connect to RENDER database');
      console.error('   Make sure DATABASE_URL or RENDER_DB_URL is set');
      throw error;
    }

    console.log('');

    // Step 2: Fetch company master records with logos from local
    console.log('📥 Fetching company data from LOCAL database...');
    
    const localQuery = `
      SELECT 
        companyid,
        companyname,
        logoimagepath
      FROM companymaster
      WHERE logoimagepath IS NOT NULL AND logoimagepath != ''
      ORDER BY companyid ASC
    `;

    const localResult = await localPool.query(localQuery);
    const companiesWithLogos = localResult.rows;

    if (companiesWithLogos.length === 0) {
      console.log('⚠️  No companies with logos found in local database');
      return;
    }

    console.log(`✅ Found ${companiesWithLogos.length} companies with logos\n`);

    // Step 3: Sync each company's logo to Render
    console.log('📤 Syncing logos to RENDER database...\n');

    let syncedCount = 0;
    let failedCount = 0;

    for (const company of companiesWithLogos) {
      try {
        const { companyid, companyname, logoimagepath } = company;

        console.log(`  Syncing: ${companyname} (ID: ${companyid})...`);

        const updateQuery = `
          UPDATE companymaster
          SET logoimagepath = $1,
              updatedat = NOW()
          WHERE companyid = $2
          RETURNING companyid, companyname
        `;

        const updateResult = await renderPool.query(updateQuery, [
          logoimagepath,
          companyid
        ]);

        if (updateResult.rows.length > 0) {
          const logoSize = logoimagepath.length;
          const logoSizeMB = (logoSize / (1024 * 1024)).toFixed(2);
          console.log(`    ✅ Synced (${logoSizeMB} MB)\n`);
          syncedCount++;
        } else {
          console.log(`    ⚠️  Company not found in Render\n`);
          failedCount++;
        }
      } catch (error) {
        console.error(`    ❌ Error: ${error.message}\n`);
        failedCount++;
      }
    }

    // Step 4: Verification
    console.log('');
    console.log('=' .repeat(60));
    console.log('📊 Sync Summary:');
    console.log(`   ✅ Successfully synced: ${syncedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log('=' .repeat(60));

    if (failedCount === 0) {
      console.log('\n✅ All logos synced successfully to Render!');
      console.log('   You can now see logos in your print previews on Render.');
    } else {
      console.log('\n⚠️  Some companies failed to sync. Check errors above.');
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

// Run the sync
syncLogoData()
  .then(() => {
    console.log('\n✅ Exiting sync script\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
