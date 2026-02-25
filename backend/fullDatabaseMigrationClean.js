const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'project1db',
});

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function migrateDatabase() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║    TWO-PHASE MIGRATION: SCHEMA → DATA                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Get all local tables
    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const tableNames = localTables.rows.map(r => r.table_name);
    console.log(`📋 Found ${tableNames.length} tables in local DB\n`);

    // =============== PHASE 1: DROP & CREATE ALL SCHEMAS ===============
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  PHASE 1: CREATE ALL TABLE SCHEMAS                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // First, drop all tables in Render (in reverse order to handle constraints)
    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name DESC"
    );

    const renderTableNames = renderTables.rows.map(r => r.table_name);
    if (renderTableNames.length > 0) {
      console.log(`🗑️  Dropping ${renderTableNames.length} existing tables from Render...\n`);
      
      for (const table of renderTableNames) {
        try {
          await renderPool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
          console.log(`  ✓ Dropped: ${table}`);
        } catch (err) {
          console.log(`  ✗ Drop failed: ${table} - ${err.message.split('\n')[0]}`);
        }
      }
      console.log();
    }

    // Now create all tables with correct schemas
    console.log('📐 Creating table schemas in Render:\n');

    const schemaMap = {};

    for (const tableName of tableNames) {
      try {
        // Get full table definition from local
        const result = await localPool.query(`
          SELECT pg_get_create_table_sql('public."${tableName}"'::regclass) as ddl
        `);

        if (!result.rows[0] || !result.rows[0].ddl) {
          // Fallback: build DDL manually
          const columns = await localPool.query(
            `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns 
             WHERE table_name = $1 
             ORDER BY ordinal_position`,
            [tableName]
          );

          const colDefs = columns.rows.map(col => {
            let def = `"${col.column_name}" ${col.data_type}`;
            if (col.is_nullable === 'NO') def += ' NOT NULL';
            return def;
          });

          const createSQL = `CREATE TABLE "${tableName}" (${colDefs.join(', ')})`;
          await renderPool.query(createSQL);
          schemaMap[tableName] = createSQL;
        } else {
          // Use native DDL
          await renderPool.query(result.rows[0].ddl);
          schemaMap[tableName] = result.rows[0].ddl;
        }

        console.log(`  ✅ ${tableName}`);

      } catch (err) {
        console.log(`  ❌ ${tableName}: ${err.message.split('\n')[0]}`);
      }
    }

    // =============== PHASE 2: MIGRATE ALL DATA ===============
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2: MIGRATE DATA TO ALL TABLES                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const stats = { total: 0, migrated: 0, skipped: 0 };

    for (const tableName of tableNames) {
      try {
        const data = await localPool.query(`SELECT * FROM "${tableName}"`);
        const rowCount = data.rows.length;

        if (rowCount === 0) {
          console.log(`  📭 ${tableName.padEnd(35)} - Empty table`);
          continue;
        }

        let inserted = 0;

        if (rowCount > 0) {
          const cols = Object.keys(data.rows[0]);
          
          // Use batch inserts
          for (const row of data.rows) {
            const values = cols.map(c => row[c]);
            const $params = cols.map((_, i) => `$${i + 1}`).join(', ');
            const insertSQL = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) 
                              VALUES (${$params})`;
            
            try {
              await renderPool.query(insertSQL, values);
              inserted++;
            } catch (e) {
              // Skip on conflict/error
            }
          }
        }

        const percent = Math.round(inserted / rowCount * 100).toString().padStart(3);
        console.log(`  📊 ${tableName.padEnd(35)} - ${inserted}/${rowCount} (${percent}%)`);
        
        stats.total += rowCount;
        stats.migrated += inserted;
        stats.skipped += rowCount - inserted;

      } catch (err) {
        console.log(`  ❌ ${tableName.padEnd(35)} - ${err.message.split('\n')[0]}`);
      }
    }

    // =============== FINAL VERIFICATION ===============
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  FINAL VERIFICATION                                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const finalRender = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const finalRenderNames = finalRender.rows.map(r => r.table_name);
    const percent = Math.round(finalRenderNames.length / tableNames.length * 100);

    console.log(`  ✅ Tables synced:    ${finalRenderNames.length}/${tableNames.length} (${percent}%)`);
    console.log(`  ✅ Data migrated:    ${stats.migrated}/${stats.total} rows (${Math.round(stats.migrated/stats.total*100)}%)`);
    
    if (finalRenderNames.length === tableNames.length && stats.migrated === stats.total) {
      console.log(`\n🎉 SUCCESS: Database fully migrated!\n`);
    } else {
      console.log(`\n⚠️  Partial migration - ${stats.skipped} rows skipped\n`);
    }

    await localPool.end();
    await renderPool.end();
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ FATAL ERROR: ${err.message}`);
    console.error(err.stack);
    await localPool.end();
    await renderPool.end();
    process.exit(1);
  }
}

migrateDatabase();
