const { Pool } = require('pg');

async function diagnoseRender() {
  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Diagnosing Render database...\n');

    // Check invoicemaster
    const masterResult = await renderPool.query(`
      SELECT invoiceid, invoicenumber, subtotal, totalamount 
      FROM invoicemaster 
      ORDER BY invoiceid 
      LIMIT 5
    `);
    console.log('📋 Sample InvoiceMaster records:');
    masterResult.rows.forEach(row => {
      console.log(`  ID: ${row.invoiceid}, Number: ${row.invoicenumber}, Amount: ${row.totalamount}`);
    });

    // Check invoicedetail
    const detailResult = await renderPool.query(`
      SELECT DISTINCT invoiceid 
      FROM invoicedetail 
      ORDER BY invoiceid 
      LIMIT 10
    `);
    console.log('\n📋 InvoiceDetail has data for invoiceids:');
    console.log(`  ${detailResult.rows.map(r => r.invoiceid).join(', ')}`);

    // Check if there's a mismatch
    console.log('\n🔍 Checking for mismatches...');
    
    // Get invoiceids that exist in master but not in detail
    const mismatchResult = await renderPool.query(`
      SELECT DISTINCT im.invoiceid, im.invoicenumber 
      FROM invoicemaster im
      LEFT JOIN invoicedetail id ON im.invoiceid = id.invoiceid
      WHERE id.invoiceid IS NULL
      LIMIT 10
    `);
    
    if (mismatchResult.rows.length > 0) {
      console.log(`❌ Found ${mismatchResult.rows.length} invoices with NO detail records:`);
      mismatchResult.rows.forEach(row => {
        console.log(`  Invoice ${row.invoiceid}: ${row.invoicenumber}`);
      });
    } else {
      console.log('✅ All invoices have detail records');
    }

    // Check total counts
    const masterCountResult = await renderPool.query('SELECT COUNT(*) as count FROM invoicemaster');
    const detailCountResult = await renderPool.query('SELECT COUNT(*) as count FROM invoicedetail');
    const detailInvoiceCountResult = await renderPool.query('SELECT COUNT(DISTINCT invoiceid) as count FROM invoicedetail');

    console.log(`\n📊 Counts:`);
    console.log(`  InvoiceMaster records: ${masterCountResult.rows[0].count}`);
    console.log(`  InvoiceDetail records: ${detailCountResult.rows[0].count}`);
    console.log(`  InvoiceDetail covering invoices: ${detailInvoiceCountResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await renderPool.end();
  }
}

diagnoseRender();
