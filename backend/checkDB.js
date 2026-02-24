const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db'
});

async function checkDatabase() {
  try {
    await client.connect();
    
    console.log('========================================');
    console.log('DATABASE STATUS CHECK');
    console.log('========================================\n');

    // Check invoices
    console.log('Invoices in database:');
    const invoices = await client.query('SELECT invoiceid, totalamount, paymentstatus FROM invoicemaster ORDER BY invoiceid DESC LIMIT 10');
    console.log(`Found ${invoices.rows.length} invoices:`);
    invoices.rows.forEach(row => {
      console.log(`  Invoice ${row.invoiceid}: Amount=₹${row.totalamount}, Status=${row.paymentstatus}`);
    });

    // Check payment records
    console.log('\nRecent payment detail records:');
    const payments = await client.query(`
      SELECT paymentreceivedid, invoiceid, amount, paymentstatus, paymentdate 
      FROM paymentdetail 
      ORDER BY paymentreceivedid DESC 
      LIMIT 15
    `);
    console.log(`Found ${payments.rows.length} payment records:`);
    payments.rows.forEach(row => {
      const invText = row.invoiceid ? `Invoice ${row.invoiceid}` : 'ADVANCE PAYMENT';
      console.log(`  Payment ${row.paymentreceivedid}: ${invText}, Amount=₹${row.amount}, Status=${row.paymentstatus}, Date=${row.paymentdate}`);
    });

    // Count unpaid invoices
    console.log('\nUnpaid invoice summary:');
    const unpaid = await client.query(`
      SELECT paymentstatus, COUNT(*) as count 
      FROM invoicemaster 
      GROUP BY paymentstatus
    `);
    unpaid.rows.forEach(row => {
      console.log(`  ${row.paymentstatus}: ${row.count} invoices`);
    });

    console.log('\n========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
