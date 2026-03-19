#!/usr/bin/env node

/**
 * Sync itemmaster table structure and data from local to Render
 * This script:
 * 1. Identifies missing columns on Render
 * 2. Creates those columns with proper types and constraints
 * 3. Syncs all itemmaster records from local to Render
 */

const localDb = require('./backend/config/db');
const { Pool } = require('pg');

// Render database connection details (from env or hardcoded for testing)
const RENDER_DB_CONFIG = {
  host: process.env.RENDER_DB_HOST || 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
  port: 5432,
  database: process.env.RENDER_DB_NAME || 'project1_z6zd',
  user: process.env.RENDER_DB_USER || 'project1_user',
  password: process.env.RENDER_DB_PASSWORD || 'abc123',
  ssl: true
};

// Column definitions for itemmaster
const ITEMMASTER_COLUMNS = {
  itemid: { type: 'SERIAL', primaryKey: true },
  partnumber: { type: 'VARCHAR(100)', notNull: true },
  itemname: { type: 'VARCHAR(500)', notNull: true },
  serialnumbertracking: { type: 'BOOLEAN', default: 'false' },
  categoryid: { type: 'INTEGER', notNull: true },
  uom: { type: 'VARCHAR(50)', notNull: true },
  hsncode: { type: 'VARCHAR(50)', nullable: true },
  mrp: { type: 'NUMERIC(12,2)', notNull: true },
  manufacturername: { type: 'VARCHAR(100)', nullable: true },
  warranty: { type: 'INTEGER', nullable: true },
  branchid: { type: 'INTEGER', notNull: true },
  extravar1: { type: 'VARCHAR(500)', nullable: true },
  extravar2: { type: 'VARCHAR(500)', nullable: true },
  extraint1: { type: 'INTEGER', nullable: true },
  createdby: { type: 'INTEGER', notNull: true },
  createdat: { type: 'DATE', default: 'CURRENT_DATE' },
  updatedby: { type: 'INTEGER', nullable: true },
  updatedat: { type: 'DATE', nullable: true },
  deletedby: { type: 'INTEGER', nullable: true },
  deletedat: { type: 'DATE', nullable: true },
  servicechargemethod: { type: 'VARCHAR(100)', notNull: true },
  duplicateserialnumber: { type: 'BOOLEAN', default: 'false' },
  points: { type: 'INTEGER', default: '0' },
  discountpercentage: { type: 'NUMERIC(5,2)', default: '0' },
  ordertype: { type: 'VARCHAR(50)', nullable: true },
  servicechargeid: { type: 'INTEGER', default: '0' }
};

async function syncItemMaster() {
  console.log('🚀 STARTING ITEMMASTER SYNC TO RENDER\n');

  try {
    const { Pool } = require('pg');
    
    // Get local DB config
    const localDbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'project1',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Ashok@123',
      ssl: false
    };
    // Connect to local database
    console.log('📡 Connecting to local database...');
    const localPool = new Pool(localDbConfig);

    // Connect to Render database
    console.log('📡 Connecting to Render database...');
    const renderPool = new Pool(RENDER_DB_CONFIG);

    // Get local itemmaster schema
    console.log('\n📋 Fetching local itemmaster schema...');
    const localSchemaResult = await localPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'itemmaster' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const localColumns = localSchemaResult.rows.map(r => r.column_name);
    console.log(`✓ Local has ${localColumns.length} columns`);

    // Get Render itemmaster schema
    console.log('\n📋 Fetching Render itemmaster schema...');
    const renderSchemaResult = await renderPool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'itemmaster' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const renderColumns = renderSchemaResult.rows.map(r => r.column_name);
    console.log(`✓ Render has ${renderColumns.length} columns`);

    // Find missing columns
    const missingColumns = localColumns.filter(col => !renderColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('\n✅ All columns already exist on Render');
    } else {
      console.log('\n⚠️  MISSING COLUMNS ON RENDER:');
      missingColumns.forEach(col => console.log(`   - ${col}`));

      // Add missing columns
      console.log('\n🔧 Adding missing columns to Render...');
      for (const colName of missingColumns) {
        const colDef = ITEMMASTER_COLUMNS[colName];
        if (!colDef) {
          console.warn(`   ⚠️  No definition found for ${colName}, skipping`);
          continue;
        }

        let alterSql = `ALTER TABLE itemmaster ADD COLUMN ${colName} ${colDef.type}`;
        if (colDef.default) {
          alterSql += ` DEFAULT ${colDef.default}`;
        }

        try {
          await renderPool.query(alterSql);
          console.log(`   ✓ Added column: ${colName}`);
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log(`   ℹ️  Column already exists: ${colName}`);
          } else {
            console.error(`   ❌ Error adding ${colName}:`, err.message);
          }
        }
      }
    }

    // Get local itemmaster data
    console.log('\n📥 Fetching local itemmaster records...');
    const localRecordsResult = await localPool.query(`
      SELECT * FROM itemmaster WHERE deletedat IS NULL ORDER BY itemid
    `);
    const localRecords = localRecordsResult.rows;
    console.log(`✓ Found ${localRecords.length} active records (deletedat IS NULL)`);

    // Get Render itemmaster record count
    console.log('\n📊 Checking Render record count...');
    const renderCountResult = await renderPool.query(`
      SELECT COUNT(*) as total FROM itemmaster
    `);
    const renderCount = renderCountResult.rows[0].total;
    console.log(`✓ Render currently has ${renderCount} records`);

    // Truncate Render itemmaster if it has data (backup first!)
    if (renderCount > 0) {
      console.log('\n⚠️  Render itemmaster has existing data. Backing up...');
      const backupTableName = `itemmaster_backup_${Date.now()}`;
      
      try {
        await renderPool.query(`CREATE TABLE ${backupTableName} AS SELECT * FROM itemmaster`);
        console.log(`✓ Backup created: ${backupTableName}`);
      } catch (err) {
        console.error(`❌ Backup failed:`, err.message);
      }

      console.log('\n🗑️  Clearing Render itemmaster...');
      try {
        await renderPool.query('DELETE FROM itemmaster WHERE true');
        console.log('✓ Cleared all records from Render itemmaster');
        // Reset sequence
        await renderPool.query(`ALTER SEQUENCE itemmaster_itemid_seq RESTART WITH 1`);
        console.log('✓ Reset itemid sequence');
      } catch (err) {
        console.error(`❌ Clear failed:`, err.message);
      }
    }

    // Sync records in batches
    console.log(`\n📤 Syncing ${localRecords.length} records to Render in batches...`);
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < localRecords.length; i += batchSize) {
      const batch = localRecords.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(localRecords.length / batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (records ${i + 1}-${Math.min(i + batchSize, localRecords.length)})`);

      for (const record of batch) {
        try {
          const cols = Object.keys(record);
          const vals = cols.map((col, idx) => `$${idx + 1}`).join(', ');
          const colNames = cols.join(', ');
          
          const insertSql = `
            INSERT INTO itemmaster (${colNames})
            VALUES (${vals})
            ON CONFLICT (itemid) DO UPDATE SET ${
              cols.filter(c => c !== 'itemid').map(c => `${c} = EXCLUDED.${c}`).join(', ')
            }
          `;

          const values = cols.map(col => record[col]);
          await renderPool.query(insertSql, values);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`   ❌ Error syncing record ${record.itemid}:`, err.message);
        }
      }

      const progress = Math.min(i + batchSize, localRecords.length);
      console.log(`   ✓ Progress: ${progress}/${localRecords.length}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETE');
    console.log(`   ✓ Successfully synced: ${successCount} records`);
    console.log(`   ❌ Failed: ${errorCount} records`);
    console.log(`   📊 Total records in Render: ${successCount}`);
    console.log('='.repeat(80));

    // Verify sync
    console.log('\n✔️  Verifying sync...');
    const verifyResult = await renderPool.query(`
      SELECT COUNT(*) as total FROM itemmaster WHERE deletedat IS NULL
    `);
    console.log(`✓ Render now has ${verifyResult.rows[0].total} active records`);

    // Close connections
    await localPool.end();
    await renderPool.end();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

syncItemMaster();
