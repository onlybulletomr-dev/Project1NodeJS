const { Pool } = require('pg');

async function mapAndSyncInvoiceDetails() {
  const localPool = new Pool({
    user: 'postgres',
    password: 'admin',
    host: 'localhost',
    port: 5432,
    database: 'Project1db'
  });

  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Mapping and Syncing InvoiceDetails (matching by invoice number)...\n');

    // Step 1: Get all invoice numbers and IDs from Render
    console.log('📍 Step 1: Getting invoice mapping from Render...');
    const renderMasterResult = await renderPool.query(
      `SELECT invoiceid, invoicenumber FROM invoicemaster ORDER BY invoiceid`
    );
    const renderMapping = new Map();
    renderMasterResult.rows.forEach(row => {
      renderMapping.set(row.invoicenumber, row.invoiceid);
    });
    console.log(`✅ Found ${renderMapping.size} invoices in Render`);

    // Step 2: Find corresponding invoices in LOCAL by number
    console.log('\n📍 Step 2: Finding corresponding records in LOCAL...');
    const localInvoiceNumbers = Array.from(renderMapping.keys()).map(num => `'${num}'`).join(',');
    const localMasterResult = await localPool.query(
      `SELECT invoiceid, invoicenumber FROM invoicemaster WHERE invoicenumber IN (${localInvoiceNumbers})`
    );
    const localMapping = new Map();
    localMasterResult.rows.forEach(row => {
      localMapping.set(row.invoicenumber, row.invoiceid);
    });
    console.log(`✅ Found ${localMapping.size} matching invoices in LOCAL`);

    // Show mapping
    console.log('\n📋 Invoice Number Mapping (LOCAL ID → RENDER ID):');
    renderMapping.forEach((renderId, number) => {
      const localId = localMapping.get(number);
      const status = localId ? '✅' : '❌';
      console.log(`${status} ${number.padEnd(15)} : LOCAL ${localId || 'NOT FOUND'} → RENDER ${renderId}`);
    });

    // Step 3: Get render columns
    console.log('\n📍 Step 3: Getting Render column structure...');
    const renderColumnsResult = await renderPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoicedetail'
    `);
    const renderColumns = new Set(renderColumnsResult.rows.map(row => row.column_name));

    // Step 4: Fetch and map detail records
    console.log('\n📍 Step 4: Fetching and mapping invoicedetail records...');
    const localDetailIds = Array.from(localMapping.values());
    const localDetailsResult = await localPool.query(
      `SELECT * FROM invoicedetail WHERE invoiceid = ANY($1::int[])`,
      [localDetailIds]
    );
    console.log(`✅ Found ${localDetailsResult.rows.length} detail records in LOCAL`);

    // Map the invoiceids
    const mappedDetails = localDetailsResult.rows.map(detail => {
      // Find which invoicenumber this belongs to
      let invoiceNumber = null;
      for (const [number, localId] of localMapping.entries()) {
        if (localId === detail.invoiceid) {
          invoiceNumber = number;
          break;
        }
      }
      
      const renderId = renderMapping.get(invoiceNumber);
      return {
        ...detail,
        invoiceid: renderId // Replace with Render ID
      };
    });

    console.log(`✅ Mapped all records to Render invoice IDs`);

    // Step 5: Clear existing records
    console.log('\n📍 Step 5: Clearing existing invoicedetail records...');
    await renderPool.query('DELETE FROM invoicedetail');
    console.log('✅ Cleared');

    // Step 6: Insert mapped records
    console.log('\n📍 Step 6: Inserting mapped records into Render...');
    let insertedCount = 0;
    let errorCount = 0;

    for (const record of mappedDetails) {
      try {
        const columnsToInsert = [];
        const valuesToInsert = [];

        for (const [col, value] of Object.entries(record)) {
          // Skip invoicedetailid if it doesn't exist in Render
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
        if (errorCount <= 3) {
          console.error(`❌ Error inserting:`, error.message);
        }
      }
    }

    console.log(`✅ Inserted ${insertedCount}/${mappedDetails.length} records`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed to insert ${errorCount} records`);
    }

    // Step 7: Verify
    console.log('\n📍 Step 7: Verifying...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a moment
    
    const verifyResult = await renderPool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        COUNT(id.invoiceid) as detail_count
      FROM invoicemaster im
      LEFT JOIN invoicedetail id ON im.invoiceid = id.invoiceid
      GROUP BY im.invoiceid, im.invoicenumber
      ORDER BY im.invoiceid
    `);

    console.log('\n✅ Final Verification:');
    console.log('ID | Invoice Number | Items');
    console.log('---|----------------|-------');
    let totalItems = 0;
    verifyResult.rows.forEach(row => {
      const status = row.detail_count > 0 ? '✅' : '❌';
      console.log(`${status} ${row.invoiceid} | ${row.invoicenumber.padEnd(14)} | ${row.detail_count}`);
      totalItems += row.detail_count;
    });

    console.log(`\n🎉 ${verifyResult.rows.filter(r => r.detail_count > 0).length} invoices now have items!`);
    console.log(`📊 Total items: ${totalItems}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

mapAndSyncInvoiceDetails();
