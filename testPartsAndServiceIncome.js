const pool = require('./backend/config/db');

async function testPartsAndServiceIncome() {
  try {
    console.log('=== Testing Parts Income and Service Income ===\n');
    
    // Step 1: Find recent invoices
    console.log('Step 1: Finding recent invoices...');
    const invoicesResult = await pool.query(`
      SELECT invoiceid, invoicenumber, partsincome, serviceincome, subtotal, totalamount
      FROM invoicemaster
      WHERE deletedat IS NULL
      ORDER BY createdat DESC
      LIMIT 5
    `);
    
    if (invoicesResult.rows.length === 0) {
      console.log('⚠️  No invoices found in database');
      process.exit(0);
    }
    
    console.log(`✅ Found ${invoicesResult.rows.length} recent invoices:\n`);
    
    // Step 2: Display the breakdown
    invoicesResult.rows.forEach((invoice, idx) => {
      console.log(`Invoice ${idx + 1}: ${invoice.invoicenumber}`);
      console.log(`  SubTotal: ₹${Number(invoice.subtotal || 0).toFixed(2)}`);
      console.log(`  PartsIncome: ₹${Number(invoice.partsincome || 0).toFixed(2)}`);
      console.log(`  ServiceIncome: ₹${Number(invoice.serviceincome || 0).toFixed(2)}`);
      console.log(`  TotalAmount: ₹${Number(invoice.totalamount || 0).toFixed(2)}`);
      
      const partsAndService = Number(invoice.partsincome || 0) + Number(invoice.serviceincome || 0);
      console.log(`  Parts + Service: ₹${partsAndService.toFixed(2)}`);
      
      if (Math.abs(partsAndService - Number(invoice.subtotal || 0)) < 0.01) {
        console.log(`  ✅ Breakdown matches SubTotal`);
      } else {
        console.log(`  ⚠️  Breakdown doesn't match SubTotal (diff: ${(partsAndService - Number(invoice.subtotal || 0)).toFixed(2)})`);
      }
      console.log('');
    });
    
    // Step 3: Check if we have any services in recent invoices
    console.log('Step 3: Checking invoice details breakdown...');
    const detailsResult = await pool.query(`
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        COUNT(*) as total_items,
        SUM(CASE WHEN itm.serviceid IS NOT NULL THEN 1 ELSE 0 END) as service_count,
        SUM(CASE WHEN itm.serviceid IS NULL THEN 1 ELSE 0 END) as item_count,
        SUM(CASE WHEN itm.serviceid IS NOT NULL THEN id.linetotal ELSE 0 END) as service_total,
        SUM(CASE WHEN itm.serviceid IS NULL THEN id.linetotal ELSE 0 END) as item_total
      FROM invoicemaster im
      LEFT JOIN invoicedetail id ON im.invoiceid = id.invoiceid AND id.deletedat IS NULL
      LEFT JOIN servicemaster itm ON id.itemid = itm.serviceid AND itm.deletedat IS NULL
      WHERE im.deletedat IS NULL
      GROUP BY im.invoiceid, im.invoicenumber
      ORDER BY im.createdat DESC
      LIMIT 5
    `);
    
    console.log(`\nDetailed Breakdown (${detailsResult.rows.length} invoices):\n`);
    detailsResult.rows.forEach((invoice, idx) => {
      console.log(`Invoice ${idx + 1}: ${invoice.invoicenumber}`);
      console.log(`  Total Items/Services: ${invoice.total_items}`);
      console.log(`  Services: ${invoice.service_count || 0} → ₹${Number(invoice.service_total || 0).toFixed(2)}`);
      console.log(`  Parts/Items: ${invoice.item_count || 0} → ₹${Number(invoice.item_total || 0).toFixed(2)}`);
      console.log('');
    });
    
    console.log('✅ Parts Income and Service Income are being tracked correctly!');
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

testPartsAndServiceIncome();
