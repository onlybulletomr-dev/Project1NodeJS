const pool = require('./config/db');

async function createTestInvoices() {
  try {
    console.log('\n========================================');
    console.log('CREATING TEST INVOICES');
    console.log('========================================\n');

    // Create test invoices with Unpaid and Partial status
    const testInvoices = [
      {
        invoicenumber: 'INV26FEB005-TEST',
        companyid: 1,
        customerid: 1,
        vehicleid: 4,
        vehiclenumber: 'TEST-001',
        invoicedate: '2026-02-23',
        totalamount: 5000,
        paymentstatus: 'Unpaid'
      },
      {
        invoicenumber: 'INV26FEB006-TEST',
        companyid: 1,
        customerid: 2,
        vehicleid: 5,
        vehiclenumber: 'TEST-002',
        invoicedate: '2026-02-23',
        totalamount: 3000,
        paymentstatus: 'Partial'
      },
      {
        invoicenumber: 'INV26FEB007-TEST',
        companyid: 1,
        customerid: 3,
        vehicleid: 6,
        vehiclenumber: 'TEST-003',
        invoicedate: '2026-02-23',
        totalamount: 2500,
        paymentstatus: 'Unpaid'
      }
    ];

    for (const invoice of testInvoices) {
      try {
        const query = `
          INSERT INTO invoicemaster (
            invoicenumber, companyid, customerid, vehicleid, vehiclenumber, 
            invoicedate, totalamount, paymentstatus, createdat, createdby, deletedat
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), 1, NULL
          ) RETURNING invoiceid
        `;
        
        const result = await pool.query(query, [
          invoice.invoicenumber,
          invoice.companyid,
          invoice.customerid,
          invoice.vehicleid,
          invoice.vehiclenumber,
          invoice.invoicedate,
          invoice.totalamount,
          invoice.paymentstatus
        ]);

        console.log(`✓ Created Invoice ID ${result.rows[0].invoiceid} - ${invoice.invoicenumber}`);
        console.log(`  Status: ${invoice.paymentstatus} | Amount: ₹${invoice.totalamount}`);
      } catch (err) {
        console.log(`✗ Failed to create ${invoice.invoicenumber}: ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('TEST INVOICES CREATED');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestInvoices();
