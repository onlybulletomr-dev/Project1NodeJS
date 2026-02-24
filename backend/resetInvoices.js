const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'Project1db'
});

async function resetInvoiceStatuses() {
  try {
    await client.connect();
    
    console.log('Resetting invoices statuses to "Unpaid"...\n');

    // Get the invoices
    const getRes = await client.query(`SELECT invoiceid FROM invoicemaster ORDER BY invoiceid`);
    
    for (const row of getRes.rows) {
      const invoiceid = row.invoiceid;
      const updateRes = await client.query(
        'UPDATE invoicemaster SET paymentstatus = $1 WHERE invoiceid = $2',
        ['Unpaid', invoiceid]
      );
      console.log(`✓ Invoice ${invoiceid} status set to "Unpaid"`);
    }

    // Also delete the advance payments that were created (paymentdetail records with invoiceid = NULL)
    console.log('\nDeleting advance payment records...');
    const deleteRes = await client.query(
      'DELETE FROM paymentdetail WHERE invoiceid IS NULL'
    );
    console.log(`✓ Deleted ${deleteRes.rowCount} advance payment records`);

    // Now verify
    console.log('\nVerifying invoice statuses:');
    const verifyRes = await client.query('SELECT invoiceid, paymentstatus FROM invoicemaster ORDER BY invoiceid');
    verifyRes.rows.forEach(row => {
      console.log(`  Invoice ${row.invoiceid}: ${row.paymentstatus}`);
    });

    console.log('\n✓ Reset complete!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

resetInvoiceStatuses();
