const { Pool } = require('pg');

async function checkInvoiceDetailMatch() {
  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking InvoiceDetail match for all InvoiceMaster records...\n');

    // Get all invoicemaster records with their details
    const result = await renderPool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.totalamount,
        COUNT(id.invoiceid) as detail_count,
        STRING_AGG(DISTINCT id.itemid::text, ', ') as item_ids
      FROM invoicemaster im
      LEFT JOIN invoicedetail id ON im.invoiceid = id.invoiceid
      GROUP BY im.invoiceid, im.invoicenumber, im.totalamount
      ORDER BY im.invoiceid
    `);

    console.log('📋 InvoiceMaster Records and Their Details:\n');
    console.log('ID | Invoice Number | Amount | Detail Count | Items');
    console.log('---|----------------|--------|--------------|-------');
    
    let withDetails = 0;
    let withoutDetails = 0;

    result.rows.forEach(row => {
      const status = row.detail_count > 0 ? '✅' : '❌';
      const items = row.item_ids ? row.item_ids.substring(0, 30) : '-';
      console.log(`${status} ${row.invoiceid} | ${row.invoicenumber.padEnd(14)} | ${row.totalamount} | ${row.detail_count} | ${items}`);
      
      if (row.detail_count > 0) {
        withDetails++;
      } else {
        withoutDetails++;
      }
    });

    console.log('\n📊 Summary:');
    console.log(`✅ Invoices WITH detail records: ${withDetails}`);
    console.log(`❌ Invoices WITHOUT detail records: ${withoutDetails}`);
    console.log(`📈 Total invoicedetail records: ${result.rows.reduce((sum, row) => sum + row.detail_count, 0)}`);

    if (withoutDetails > 0) {
      console.log(`\n⚠️  ${withoutDetails} invoices have NO line items!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await renderPool.end();
  }
}

checkInvoiceDetailMatch();
