require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/db');

async function testInvoiceDetails() {
  try {
    console.log('Testing invoice details with item/service descriptions...\n');
    
    // First check column names
    const columnResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoicedetail' 
      ORDER BY ordinal_position
    `);
    
    console.log('Invoicedetail table columns:');
    columnResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    console.log();
    
    // Get first invoice
    const invoiceResult = await pool.query(
      `SELECT invoiceid, invoicenumber FROM invoicemaster WHERE deletedat IS NULL LIMIT 1`
    );
    
    if (invoiceResult.rows.length === 0) {
      console.log('No invoices found in database');
      await pool.end();
      return;
    }
    
    const invoiceId = invoiceResult.rows[0].invoiceid;
    console.log(`Testing with Invoice ID: ${invoiceId}, Invoice Number: ${invoiceResult.rows[0].invoicenumber}\n`);
    
    // Get invoice details with itemmaster and servicemaster joins
    const detailResult = await pool.query(`
      SELECT 
        id.itemid,
        id.qty,
        id.unitprice,
        COALESCE(im.partnumber, sm.servicenumber, CAST(id.itemid AS VARCHAR)) as partnumber,
        COALESCE(im.itemname, COALESCE(sm.description, sm.servicename), 'Item ' || CAST(id.itemid AS VARCHAR)) as description,
        CASE 
          WHEN im.itemid IS NOT NULL THEN 'item'
          WHEN sm.serviceid IS NOT NULL THEN 'service'
          ELSE 'unknown'
        END as source
      FROM invoicedetail id
      LEFT JOIN itemmaster im ON id.itemid = im.itemid AND im.deletedat IS NULL
      LEFT JOIN servicemaster sm ON id.itemid = sm.serviceid AND sm.deletedat IS NULL
      WHERE id.invoiceid = $1 AND id.deletedat IS NULL
      ORDER BY id.itemid
    `, [invoiceId]);
    
    console.log('Invoice Details:');
    console.log('================');
    detailResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ItemID: ${row.itemid}, Partner/Service#: ${row.partnumber}`);
      console.log(`   Description: ${row.description}`);
      console.log(`   Source: ${row.source}`);
      console.log(`   Qty: ${row.qty}, Unit Price: ${row.unitprice}`);
    });
    
    console.log('\n\n✓ Test complete!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testInvoiceDetails();
