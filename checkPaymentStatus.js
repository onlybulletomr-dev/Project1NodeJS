require('dotenv').config();
const pool = require('./backend/config/db');

async function checkInvoices() {
  try {
    console.log('Connecting to Render database...');
    const result = await pool.query(`
      SELECT invoiceid, invoicenumber, branchid, paymentstatus, totalamount, createdat
      FROM invoicemaster
      WHERE deletedat IS NULL
      ORDER BY createdat DESC
      LIMIT 20
    `);
    
    console.log('\n=== INVOICES IN RENDER DATABASE ===');
    if (result.rows.length === 0) {
      console.log('No invoices found!');
    } else {
      console.log(`Total: ${result.rows.length} invoices\n`);
      result.rows.forEach(row => {
        console.log(`ID: ${row.invoiceid} | Number: ${row.invoicenumber} | Status: ${row.paymentstatus} | Amount: ${row.totalamount} | Branch: ${row.branchid} | Date: ${row.createdat}`);
      });
    }
    
    console.log('\n=== COUNT BY PAYMENT STATUS ===');
    const statusCount = await pool.query(`
      SELECT paymentstatus, COUNT(*) as count
      FROM invoicemaster
      WHERE deletedat IS NULL
      GROUP BY paymentstatus
    `);
    
    statusCount.rows.forEach(row => {
      console.log(`${row.paymentstatus}: ${row.count}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkInvoices();
