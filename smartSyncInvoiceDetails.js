const { Pool } = require('pg');

async function smartSyncInvoiceDetails() {
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
    console.log('🔄 Smart InvoiceDetail Sync (matching Render invoicemaster)...\n');

    // Step 1: Get invoice IDs that exist in Render's invoicemaster
    console.log('📍 Step 1: Getting invoice IDs from Render invoicemaster...');
    const renderMasterResult = await renderPool.query(
      `SELECT invoiceid, invoicenumber FROM invoicemaster ORDER BY invoiceid`
    );
    const renderInvoiceIds = renderMasterResult.rows.map(row => row.invoiceid);
    console.log(`✅ Found ${renderInvoiceIds.length} invoicemaster records in Render`);
    console.log(`   IDs: ${renderInvoiceIds.join(', ')}`);

    // Step 2: Get corresponding invoicedetail records from LOCAL
    console.log('\n📍 Step 2: Fetching corresponding invoicedetail records from local...');
    const localDetailsResult = await localPool.query(
      `SELECT * FROM invoicedetail WHERE invoiceid = ANY($1::int[]) ORDER BY invoiceid`,
      [renderInvoiceIds]
    );
    const localDetails = localDetailsResult.rows;
    console.log(`✅ Found ${localDetails.length} invoicedetail records in local for these invoiceids`);

    // Step 3: Get render columns
    console.log('\n📍 Step 3: Getting Render invoicedetail column structure...');
    const renderColumnsResult = await renderPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoicedetail'
      ORDER BY ordinal_position
    `);
    const renderColumns = new Set(renderColumnsResult.rows.map(row => row.column_name));
    console.log(`✅ Render has columns: ${Array.from(renderColumns).join(', ')}`);

    // Step 4: Clear existing invoicedetail records in Render
    console.log('\n📍 Step 4: Clearing existing invoicedetail records from Render...');
    const deleteResult = await renderPool.query('DELETE FROM invoicedetail');
    console.log(`✅ Deleted ${deleteResult.rowCount} old records`);

    // Step 5: Insert correct records
    console.log('\n📍 Step 5: Inserting correct invoicedetail records...');
    let insertedCount = 0;
    let errorCount = 0;

    for (const record of localDetails) {
      try {
        // Build insert with only available columns
        const columnsToInsert = [];
        const valuesToInsert = [];

        for (const [col, value] of Object.entries(record)) {
          // Skip invoicedetailid if it doesn't exist (map to id)
          if (col === 'invoicedetailid' && !renderColumns.has('invoicedetailid')) {
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

    console.log(`✅ Inserted ${insertedCount}/${localDetails.length} records successfully`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed to insert ${errorCount} records`);
    }

    // Step 6: Verify
    console.log('\n📍 Step 6: Verifying sync...');
    const verifyResult = await renderPool.query('SELECT COUNT(*) as count FROM invoicedetail');
    const totalDetailRecords = verifyResult.rows[0].count;
    console.log(`✅ Render now has ${totalDetailRecords} invoicedetail records`);

    // Check coverage
    const coverageResult = await renderPool.query(
      `SELECT COUNT(DISTINCT invoiceid) as count FROM invoicedetail`
    );
    const coveredInvoices = coverageResult.rows[0].count;
    console.log(`✅ Covering ${coveredInvoices} invoices`);

    // Show which invoices now have items
    const invoiceWithItemsResult = await renderPool.query(`
      SELECT DISTINCT id.invoiceid, im.invoicenumber, COUNT(*) as item_count
      FROM invoicedetail id
      JOIN invoicemaster im ON id.invoiceid = im.invoiceid
      GROUP BY id.invoiceid, im.invoicenumber
      ORDER BY id.invoiceid
    `);

    console.log('\n📋 Invoices with items:');
    invoiceWithItemsResult.rows.forEach(row => {
      console.log(`  Invoice ${row.invoiceid}: ${row.invoicenumber} - ${row.item_count} items`);
    });

    console.log('\n🎉 SUCCESS! Sync complete!');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

smartSyncInvoiceDetails();
