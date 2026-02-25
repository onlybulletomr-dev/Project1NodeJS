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

const log = [];
const addLog = (msg) => {
  console.log(msg);
  log.push(msg);
};

async function createAllTablesFirst() {
  try {
    addLog('\n╔═══════════════════════════════════════════════════════╗');
    addLog('║      PHASE 1: CREATE ALL TABLE SCHEMAS FIRST         ║');
    addLog('╚═══════════════════════════════════════════════════════╝\n');

    // Get all local tables
    const localTables = await localPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const tableNames = localTables.rows.map(r => r.table_name);
    addLog(`📋 Found ${tableNames.length} tables to migrate:\n`);

    // PHASE 1: Create all table structures
    for (const tableName of tableNames) {
      try {
        // Get column definitions
        const columns = await localPool.query(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position`,
          [tableName]
        );

        // Get primary key constraints
        const pk = await localPool.query(
          `SELECT column_name
           FROM information_schema.key_column_usage
           WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY'`,
          [tableName]
        );

        // Build column definitions
        let colDefs = columns.rows.map(col => {
          let def = `"${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default && !col.column_default.includes('nextval')) {
            def += ` DEFAULT ${col.column_default}`;
          }
          return def;
        });

        // Add primary key if exists
        if (pk.rows.length > 0) {
          const pkCols = pk.rows.map(r => `"${r.column_name}"`).join(', ');
          colDefs.push(`PRIMARY KEY (${pkCols})`);
        }

        const createStmt = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs.join(', ')})`;
        
        await renderPool.query(createStmt);
        addLog(`✅ ${tableName.padEnd(30)} - Schema created`);

      } catch (err) {
        addLog(`❌ ${tableName.padEnd(30)} - ERROR: ${err.message.split('\n')[0]}`);
      }
    }

    addLog('\n╔═══════════════════════════════════════════════════════╗');
    addLog('║      PHASE 2: MIGRATE DATA TO ALL TABLES             ║');
    addLog('╚═══════════════════════════════════════════════════════╝\n');

    // PHASE 2: Migrate data into all tables
    for (const tableName of tableNames) {
      try {
        const data = await localPool.query(`SELECT * FROM "${tableName}"`);
        const rowCount = data.rows.length;

        if (rowCount === 0) {
          addLog(`📭 ${tableName.padEnd(30)} - Empty (0 rows)`);
          continue;
        }

        const cols = Object.keys(data.rows[0]);
        let inserted = 0;
        let skipped = 0;

        // Batch insert for performance
        const batchSize = 100;
        for (let i = 0; i < data.rows.length; i += batchSize) {
          const batch = data.rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = cols.map(c => row[c]);
            const $params = cols.map((_, idx) => `$${idx + 1}`).join(', ');
            const insertSQL = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) 
                              VALUES (${$params}) ON CONFLICT DO NOTHING`;
            
            try {
              const result = await renderPool.query(insertSQL, values);
              if (result.rowCount > 0) {
                inserted++;
              } else {
                skipped++;
              }
            } catch (e) {
              skipped++;
            }
          }
        }

        const status = skipped > 0 ? `(${skipped} skipped due to conflicts)` : '';
        addLog(`📊 ${tableName.padEnd(30)} - ${inserted}/${rowCount} rows migrated ${status}`);

      } catch (err) {
        addLog(`❌ ${tableName.padEnd(30)} - ERROR: ${err.message.split('\n')[0]}`);
      }
    }

    // FINAL STATUS
    addLog('\n╔═══════════════════════════════════════════════════════╗');
    addLog('║            FINAL VERIFICATION                        ║');
    addLog('╚═══════════════════════════════════════════════════════╝\n');

    const renderTables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    const renderTableNames = renderTables.rows.map(r => r.table_name);
    const percent = Math.round(renderTableNames.length / tableNames.length * 100);

    addLog(`✅ Local DB:    ${tableNames.length} tables`);
    addLog(`✅ Render DB:   ${renderTableNames.length} tables`);
    addLog(`✅ Sync Status: ${percent}% complete\n`);

    if (renderTableNames.length === tableNames.length) {
      addLog('🎉 SUCCESS: All tables created and data migrated!\n');
    } else {
      const missing = tableNames.filter(t => !renderTableNames.includes(t));
      addLog(`⚠️  Still missing: ${missing.join(', ')}\n`);
    }

    await localPool.end();
    await renderPool.end();
    process.exit(0);

  } catch (err) {
    addLog(`\n❌ FATAL ERROR: ${err.message}`);
    addLog(err.stack);
    await localPool.end();
    await renderPool.end();
    process.exit(1);
  }
}

createAllTablesFirst();
