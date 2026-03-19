const { Pool } = require('pg');

async function checkInvoiceDetails() {
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
    console.log('🔍 Checking invoice OMR26MAR008...\n');

    // Find invoice by number
    const invoiceResult = await renderPool.query(
      `SELECT invoiceid, invoicenumber, subtotal, totalamount FROM invoicemaster WHERE invoicenumber = $1`,
      ['OMR26MAR008']
    );

    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice OMR26MAR008 not found in Render!');
      return;
    }

    const invoice = invoiceResult.rows[0];
    console.log('✅ Found invoice:');
    console.log(`   Invoice ID: ${invoice.invoiceid}`);
    console.log(`   Invoice Number: ${invoice.invoicenumber}`);
    console.log(`   Subtotal: ${invoice.subtotal}`);
    console.log(`   Total Amount: ${invoice.totalamount}`);

    // Check if invoice detail records exist
    console.log(`\n📍 Checking invoicedetail records...`);
    const detailResult = await renderPool.query(
      `SELECT * FROM invoicedetail WHERE invoiceid = $1`,
      [invoice.invoiceid]
    );

    console.log(`✅ Found ${detailResult.rows.length} detail records`);
    
    if (detailResult.rows.length === 0) {
      console.log('❌ No invoice detail records found!');
      console.log('\n🔍 Checking all tables for this invoice...');
      
      // Check what tables might have this invoice's data
      const allInvoices = await renderPool.query('SELECT COUNT(*) as count FROM invoicedetail');
      console.log(`Total invoicedetail records in table: ${allInvoices.rows[0].count}`);
    } else {
      console.log('\n📋 Invoice Detail Records:');
      detailResult.rows.forEach((row, i) => {
        console.log(`\n  Item ${i + 1}:`);
        console.log(`    invoiceid: ${row.invoiceid}`);
        console.log(`    itemid: ${row.itemid}`);
        console.log(`    qty: ${row.qty}`);
        console.log(`    unitprice: ${row.unitprice}`);
        console.log(`    linetotal: ${row.linetotal}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await renderPool.end();
  }
}

checkInvoiceDetails();
