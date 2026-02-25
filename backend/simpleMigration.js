const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'project1db',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function simpleMigrate() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║      SIMPLE TWO-PHASE MIGRATION                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Get all tables
    const local = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tableNames = local.rows.map(r => r.table_name);
    console.log(`📋 Found ${tableNames.length} tables\n`);

    // ========== PHASE 1: DROP ALL IN RENDER & CREATE SCHEMAS ==========
    console.log('PHASE 1: Creating table schemas...\n');

    const render = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name DESC"
    );
    const renderTableNames = render.rows.map(r => r.table_name);

    // Drop in reverse
    for (const t of renderTableNames) {
      await renderPool.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }
    if (renderTableNames.length > 0) {
      console.log(`🗑️  Dropped ${renderTableNames.length} existing tables\n`);
    }

    // Create all empty  tables
    for (const table of tableNames) {
      try {
        const cols = await localPool.query(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position`,
          [table]
        );

        const colDefs = cols.rows.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          return def;
        });

        const create = `CREATE TABLE "${table}" (${colDefs.join(', ')})`;
        await renderPool.query(create);
        console.log(`✓ ${table}`);

      } catch (err) {
        console.log(`✗ ${table}: ${err.message.substring(0, 50)}`);
      }
    }

    // ========== PHASE 2: MIGRATE ALL DATA ==========
    console.log('\nPHASE 2: Migrating data...\n');

    let totalRows = 0;
    let migratedRows = 0;

    for (const table of tableNames) {
      try {
        const data = await localPool.query(`SELECT * FROM "${table}"`);
        const rowCount = data.rows.length;
        totalRows += rowCount;

        if (rowCount === 0) {
          console.log(`📭 ${table.padEnd(30)} - 0 rows`);
          continue;
        }

        const cols = Object.keys(data.rows[0]);
        let inserted = 0;

        for (const row of data.rows) {
          try {
            const vals = cols.map(c => row[c]);
            const params = cols.map((_, i) => `$${i + 1}`).join(', ');
            const insert = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${params})`;
            await renderPool.query(insert, vals);
            inserted++;
          } catch (e) {
            // Skip 
          }
        }

        migratedRows += inserted;
        const pct = Math.round(inserted / rowCount * 100).toString().padStart(3);
        console.log(`✓ ${table.padEnd(30)} - ${inserted}/${rowCount} (${pct}%)`);

      } catch (err) {
        console.log(`✗ ${table.padEnd(30)} - ${err.message.substring(0, 40)}`);
      }
    }

    // ========== FINAL STATUS ==========
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  MIGRATION COMPLETE                                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const finalRender = await renderPool.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
    );

    const tableCount = finalRender.rows[0].count;
    const dataPct = Math.round(migratedRows / totalRows * 100);

    console.log(`✅ Tables created: ${tableCount}/${tableNames.length}`);
    console.log(`✅ Data migrated:  ${migratedRows}/${totalRows} (${dataPct}%)\n`);

    if (tableCount === tableNames.length && dataPct === 100) {
      console.log('🎉 SUCCESS!\n');
    }

    await localPool.end();
    await renderPool.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    await localPool.end();
    await renderPool.end();
    process.exit(1);
  }
}

simpleMigrate();
