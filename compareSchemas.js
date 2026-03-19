const { Pool } = require('pg');

async function compareSchemas() {
  // Local database
  const localPool = new Pool({
    user: 'postgres',
    password: 'admin',
    host: 'localhost',
    port: 5432,
    database: 'Project1db'
  });

  // Render database
  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Comparing schema for invoicemaster and invoicedetail...\n');

    for (const table of ['invoicemaster', 'invoicedetail']) {
      console.log(`\n═══════════════════════════════════════════`);
      console.log(`TABLE: ${table.toUpperCase()}`);
      console.log(`═══════════════════════════════════════════\n`);

      // Get local schema
      const localResult = await localPool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      // Get Render schema
      const renderResult = await renderPool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const localCols = new Map(localResult.rows.map(r => [r.column_name, r]));
      const renderCols = new Map(renderResult.rows.map(r => [r.column_name, r]));

      console.log('LOCAL COLUMNS:', localResult.rows.length);
      console.log('RENDER COLUMNS:', renderResult.rows.length);

      // Find differences
      const allCols = new Set([...localCols.keys(), ...renderCols.keys()]);
      const differences = [];

      for (const col of Array.from(allCols).sort()) {
        const localCol = localCols.get(col);
        const renderCol = renderCols.get(col);

        if (!localCol) {
          differences.push({
            column: col,
            status: '❌ MISSING IN LOCAL',
            local: null,
            render: `${renderCol.data_type}${renderCol.character_maximum_length ? `(${renderCol.character_maximum_length})` : ''}`
          });
        } else if (!renderCol) {
          differences.push({
            column: col,
            status: '❌ MISSING IN RENDER',
            local: `${localCol.data_type}${localCol.character_maximum_length ? `(${localCol.character_maximum_length})` : ''}`,
            render: null
          });
        } else {
          const localType = `${localCol.data_type}${localCol.character_maximum_length ? `(${localCol.character_maximum_length})` : ''}`;
          const renderType = `${renderCol.data_type}${renderCol.character_maximum_length ? `(${renderCol.character_maximum_length})` : ''}`;
          
          if (localType !== renderType || localCol.is_nullable !== renderCol.is_nullable) {
            differences.push({
              column: col,
              status: '⚠️  DIFFERENT',
              local: `${localType}, nullable=${localCol.is_nullable}`,
              render: `${renderType}, nullable=${renderCol.is_nullable}`
            });
          }
        }
      }

      if (differences.length === 0) {
        console.log('✅ ALL COLUMNS MATCH!\n');
      } else {
        console.log(`⚠️  DIFFERENCES FOUND: ${differences.length}\n`);
        differences.forEach(diff => {
          console.log(`${diff.status}`);
          console.log(`  Column: ${diff.column}`);
          if (diff.local) console.log(`  📍 Local:  ${diff.local}`);
          if (diff.render) console.log(`  🌐 Render: ${diff.render}`);
          console.log('');
        });
      }

      console.log('\n📋 FULL LOCAL SCHEMA:');
      localResult.rows.forEach(row => {
        const type = `${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`;
        console.log(`  ${row.column_name.padEnd(25)} ${type.padEnd(20)} nullable=${row.is_nullable}`);
      });

      console.log('\n📋 FULL RENDER SCHEMA:');
      renderResult.rows.forEach(row => {
        const type = `${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`;
        console.log(`  ${row.column_name.padEnd(25)} ${type.padEnd(20)} nullable=${row.is_nullable}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

compareSchemas();
