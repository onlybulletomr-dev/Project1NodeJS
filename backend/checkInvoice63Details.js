const db = require('./config/db');

async function checkInvoice63Details() {
  try {
    console.log('Checking invoice 63 details in database...\n');
    
    // Check ALL detail rows for invoice 63 (including soft-deleted)
    const allQuery = `
      SELECT invoicedetailid, invoiceid, itemid, qty, unitprice, deletedat, deletedby
      FROM invoicedetail
      WHERE invoiceid = 63
      ORDER BY invoicedetailid
    `;
    
    const allResult = await db.query(allQuery);
    console.log('=== ALL DETAIL ROWS FOR INVOICE 63 (including deleted) ===');
    console.log('Total rows found:', allResult.rows.length);
    allResult.rows.forEach(row => {
      console.log(`  ID: ${row.invoicedetailid}, ItemID: ${row.itemid}, Qty: ${row.qty}, Deleted: ${row.deletedat ? 'YES' : 'NO'}`);
    });
    
    // Check ACTIVE detail rows for invoice 63 (deletedat IS NULL)
    const activeQuery = `
      SELECT invoicedetailid, invoiceid, itemid, qty, unitprice
      FROM invoicedetail
      WHERE invoiceid = 63 AND deletedat IS NULL
      ORDER BY invoicedetailid
    `;
    
    const activeResult = await db.query(activeQuery);
    console.log('\n=== ACTIVE DETAIL ROWS FOR INVOICE 63 (not deleted) ===');
    console.log('Active rows found:', activeResult.rows.length);
    activeResult.rows.forEach(row => {
      console.log(`  ID: ${row.invoicedetailid}, ItemID: ${row.itemid}, Qty: ${row.qty}`);
    });
    
    // Check the max InvoiceDetailID in the table
    const maxIdQuery = `
      SELECT MAX(invoicedetailid) as max_id, COUNT(*) as total_rows FROM invoicedetail
    `;
    const maxIdResult = await db.query(maxIdQuery);
    console.log('\n=== INVOICEDETAIL TABLE STATS ===');
    console.log('Max InvoiceDetailID:', maxIdResult.rows[0].max_id);
    console.log('Total detail rows:', maxIdResult.rows[0].total_rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoice63Details();
