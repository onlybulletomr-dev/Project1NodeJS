const { Pool } = require('pg');

async function syncInvoiceDetails() {
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
    console.log('🔄 Starting InvoiceDetail sync...\n');

    // Step 1: Get all records from local invoicedetail
    console.log('📍 Step 1: Fetching all invoicedetail records from local...');
    const recordsResult = await localPool.query('SELECT * FROM invoicedetail');
    const records = recordsResult.rows;
    console.log(`✅ Found ${records.length} invoicedetail records in local`);

    if (records.length === 0) {
      console.log('⚠️  No records to sync.');
      return;
    }

    // Step 1b: Get render columns upfront
    console.log('\n📍 Checking Render invoicedetail columns...');
    const renderColumnsResult = await renderPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoicedetail'
      ORDER BY ordinal_position
    `);
    const renderColumns = new Set(renderColumnsResult.rows.map(row => row.column_name));
    console.log(`✅ Render has columns: ${Array.from(renderColumns).join(', ')}`);

    // Step 2: Get current count in Render
    console.log('\n📍 Step 2: Checking current invoicedetail count in Render...');
    const renderCountResult = await renderPool.query('SELECT COUNT(*) as count FROM invoicedetail');
    const renderCount = renderCountResult.rows[0].count;
    console.log(`   Current records in Render: ${renderCount}`);

    // Step 3: Clear existing records
    console.log('\n📍 Step 3: Clearing existing records in Render invoicedetail...');
    await renderPool.query('DELETE FROM invoicedetail');
    console.log('✅ Cleared existing records');

    // Step 4: Insert all records from local
    console.log('\n📍 Step 4: Inserting records into Render...');

    let insertedCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
      try {
        // Build insert statement based on available columns in Render
        const columnsToInsert = [];
        const valuesToInsert = [];

        for (const [col, value] of Object.entries(record)) {
          // Skip invoicedetailid if it doesn't exist (map to id later if needed)
          if (col === 'invoicedetailid' && !renderColumns.has('invoicedetailid')) {
            // Map to 'id' if it exists
            if (renderColumns.has('id')) {
              columnsToInsert.push('id');
              valuesToInsert.push(value);
            }
            continue;
          }
          
          if (renderColumns.has(col)) {
            columnsToInsert.push(col);
            valuesToInsert.push(value);
          }
        }

        if (columnsToInsert.length === 0) {
          console.error(`❌ No valid columns for record`);
          errorCount++;
          continue;
        }

        const placeholders = valuesToInsert.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `
          INSERT INTO invoicedetail (${columnsToInsert.join(', ')})
          VALUES (${placeholders})
        `;

        await renderPool.query(insertSQL, valuesToInsert);
        insertedCount++;
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`❌ Error inserting record for invoice ${record.invoiceid}:`, error.message);
        }
      }
    }

    console.log(`✅ Inserted ${insertedCount}/${records.length} records successfully`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed to insert ${errorCount} records`);
    }

    // Step 5: Verify sync
    console.log('\n📍 Step 5: Verifying sync in Render...');
    const verifyResult = await renderPool.query('SELECT COUNT(*) as count FROM invoicedetail');
    const newRenderCount = verifyResult.rows[0].count;
    console.log(`✅ Render now has ${newRenderCount} invoicedetail records`);

    // Step 6: Check specific invoice
    console.log('\n📍 Step 6: Checking invoice OMR26MAR008 (invoice_id=14)...');
    const specificInvoiceResult = await renderPool.query(
      'SELECT COUNT(*) as count FROM invoicedetail WHERE invoiceid = 14'
    );
    const invoice14Count = specificInvoiceResult.rows[0].count;
    console.log(`✅ Invoice 14 now has ${invoice14Count} detail records`);

    if (newRenderCount === records.length) {
      console.log('\n🎉 SUCCESS! All InvoiceDetail records synced!');
    } else {
      console.log(`\n⚠️  Warning: Expected ${records.length} records but found ${newRenderCount}`);
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

syncInvoiceDetails();
