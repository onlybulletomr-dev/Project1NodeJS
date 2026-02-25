const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'project1db',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function migrateDataOnly() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║    MIGRATING DATA TO EXISTING TABLES                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Get all tables
    const local = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const render = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const localTables = local.rows.map(r => r.table_name);
    const renderTables = render.rows.map(r => r.table_name);

    console.log(`📊 Local DB:  ${localTables.length} tables`);
    console.log(`📊 Render DB: ${renderTables.length} tables\n`);

    const missing = localTables.filter(t => !renderTables.includes(t));
    if (missing.length > 0) {
      console.log(`⚠️  These tables don't exist in Render: ${missing.join(', ')}\n`);
    }

    // ========== MIGRATE DATA TO EXISTING TABLES ==========
    console.log('Migrating data:\n');

    let totalLocal = 0;
    let totalMigrated = 0;

    for (const table of localTables) {
      if (!renderTables.includes(table)) {
        console.log(`⏭️  ${table.padEnd(30)} - Table doesn't exist in Render, skipping`);
        continue;
      }

      try {
        const data = await localPool.query(`SELECT * FROM "${table}"`);
        const rowCount = data.rows.length;
        totalLocal += rowCount;

        if (rowCount === 0) {
          console.log(`📭 ${table.padEnd(30)} - 0 rows (empty table)`);
          continue;
        }

        const cols = Object.keys(data.rows[0]);
        let inserted = 0;
        let errors = 0;

        for (const row of data.rows) {
          try {
            const vals = cols.map(c => row[c]);
            const params = cols.map((_, i) => `$${i + 1}`).join(', ');
            const insert = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${params})`;
            const result = await renderPool.query(insert, vals);
            if (result.rowCount > 0) {
              inserted++;
            }
          } catch (e) {
            errors++;
          }
        }

        totalMigrated += inserted;
        const pct = Math.round(inserted / rowCount * 100).toString().padStart(3);
        const status = errors > 0 ? ` (${errors} conflicts)` : '';
        console.log(`✓ ${table.padEnd(30)} - ${inserted}/${rowCount} rows (${pct}%)${status}`);

      } catch (err) {
        console.log(`✗ ${table.padEnd(30)} - ERROR: ${err.message.split('\n')[0]}`);
      }
    }

    // ========== FINAL STATUS ==========
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  DATA MIGRATION COMPLETE                              ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const dataPct = totalLocal > 0 ? Math.round(totalMigrated / totalLocal * 100) : 0;

    console.log(`✅ Tables:      ${renderTables.length}/${localTables.length}`);
    console.log(`✅ Data:        ${totalMigrated}/${totalLocal} rows (${dataPct}%)\n`);

    if (renderTables.length === localTables.length && dataPct === 100) {
      console.log('🎉 SUCCESS: All tables synced with complete data!\n');
    } else if (dataPct >= 90) {
      console.log('✅ Migration mostly complete - some conflicts may have been skipped.\n');
    }

    await localPool.end();
    await renderPool.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    await localPool.end();
    await renderPool.end();
    process.exit(1);
  }
}

migrateDataOnly();
