const { Pool } = require('pg');

async function matchAndFixInvoiceDetails() {
  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Matching and fixing InvoiceDetail IDs in Render...\n');

    // Step 1: Get all invoicemaster records
    console.log('📍 Step 1: Getting invoicemaster records...');
    const masterResult = await renderPool.query(
      `SELECT invoiceid, invoicenumber, invoicedate, subtotal, customerid FROM invoicemaster ORDER BY invoiceid`
    );
    console.log(`✅ Found ${masterResult.rows.length} invoicemaster records`);

    // Step 2: Get all invoicedetail records with their grouping info
    console.log('\n📍 Step 2: Getting invoicedetail records...');
    const detailResult = await renderPool.query(`
      SELECT 
        DISTINCT id.invoiceid,
        COUNT(*) as item_count,
        SUM(id.linetotal) as total_line_amount,
        MIN(id.createdat) as first_created
      FROM invoicedetail id
      GROUP BY id.invoiceid
      ORDER BY id.invoiceid
    `);
    console.log(`✅ Found ${detailResult.rows.length} invoicedetail groups (by invoiceid)`);

    // Show what we have
    console.log('\n📋 Current State:');
    console.log('InvoiceMaster IDs:', masterResult.rows.map(r => r.invoiceid).join(', '));
    console.log('InvoiceDetail IDs:', detailResult.rows.map(r => r.invoiceid).join(', '));

    // Step 3: Try to match by total amount
    console.log('\n📍 Step 3: Attempting to match by subtotal amount...');
    const mapping = new Map();
    
    for (const detail of detailResult.rows) {
      const roundedDetailTotal = Math.round(detail.total_line_amount);
      
      // Find matching invoicemaster by subtotal
      const match = masterResult.rows.find(master => {
        const roundedMasterTotal = Math.round(master.subtotal);
        return roundedMasterTotal === roundedDetailTotal;
      });

      if (match) {
        console.log(`  ✅ InvoiceDetail ${detail.invoiceid} (${detail.item_count} items, ₹${detail.total_line_amount}) → InvoiceMaster ${match.invoiceid} (${match.invoicenumber}, ₹${match.subtotal})`);
        mapping.set(detail.invoiceid, match.invoiceid);
      } else {
        console.log(`  ❌ InvoiceDetail ${detail.invoiceid} (₹${detail.total_line_amount}) → NO MATCH FOUND`);
      }
    }

    if (mapping.size === 0) {
      console.log('\n⚠️  No matches found by amount. Need manual mapping or alternative approach.');
      console.log('\n📊 Amounts in Render:');
      console.log('\nInvoiceMaster:');
      masterResult.rows.forEach(m => console.log(`  ID ${m.invoiceid}: ${m.invoicenumber} = ₹${m.subtotal}`));
      console.log('\nInvoiceDetail totals:');
      detailResult.rows.forEach(d => console.log(`  ID ${d.invoiceid}: ₹${d.total_line_amount} (${d.item_count} items)`));
      return;
    }

    // Step 4: Update invoicedetail records with correct invoiceid
    console.log(`\n📍 Step 4: Updating ${mapping.size} invoicedetail groups with correct IDs...`);
    let updateCount = 0;
    
    for (const [oldId, newId] of mapping.entries()) {
      try {
        const result = await renderPool.query(
          `UPDATE invoicedetail SET invoiceid = $1 WHERE invoiceid = $2`,
          [newId, oldId]
        );
        console.log(`  ✅ Updated ${result.rowCount} records: ${oldId} → ${newId}`);
        updateCount += result.rowCount;
      } catch (error) {
        console.error(`  ❌ Error updating ${oldId}:`, error.message);
      }
    }

    // Step 5: Verify
    console.log(`\n📍 Step 5: Verifying final state...`);
    const verifyResult = await renderPool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.subtotal as master_amount,
        COUNT(id.invoiceid) as detail_count,
        COALESCE(SUM(id.linetotal), 0) as detail_amount
      FROM invoicemaster im
      LEFT JOIN invoicedetail id ON im.invoiceid = id.invoiceid
      GROUP BY im.invoiceid, im.invoicenumber, im.subtotal
      ORDER BY im.invoiceid
    `);

    console.log('\n✅ Final State:');
    console.log('ID | Invoice Number | Master Amount | Items | Detail Amount | Match?');
    console.log('---|----------------|---------------|-------|---------------|--------');
    
    let successCount = 0;
    verifyResult.rows.forEach(row => {
      const match = Math.abs(row.master_amount - row.detail_amount) < 1 ? '✅' : '❌';
      console.log(`${match} ${row.invoiceid} | ${row.invoicenumber.padEnd(14)} | ₹${row.master_amount} | ${row.detail_count} | ₹${row.detail_amount} |`);
      if (row.detail_count > 0) successCount++;
    });

    console.log(`\n🎉 Result: ${successCount} invoices now have detail records!`);
    console.log(`📊 Total items: ${verifyResult.rows.reduce((sum, r) => sum + r.detail_count, 0)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await renderPool.end();
  }
}

matchAndFixInvoiceDetails();
