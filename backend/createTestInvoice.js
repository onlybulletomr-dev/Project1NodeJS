const pool = require('./config/db');

async function createTestInvoice() {
  try {
    const result = await pool.query(`
      INSERT INTO invoicemaster (
        invoicenumber, branchid, customerid, vehicleid, jobcardid,
        invoicedate, invoicetype, subtotal, totaldiscount, 
        partsincome, serviceincome, tax1, tax2, 
        totalamount, technicianmain, serviceadvisorin,
        odometer, notes, createdby, paymentstatus
      ) VALUES (
        'TESTINV' || TO_CHAR(NOW(), 'DDHHmmss'), 
        2, 50, 4, 'TEST-001', NOW(), 'Service Invoice',
        1500.00, 0.00, 1500.00, 0.00, 0.00, 0.00, 
        1500.00, 'Manikandan', 'Manikandan',
        12500.00, 'Test Invoice for Payment Recording',
        1, 'Pending'
      )
      RETURNING invoiceid, invoicenumber, totalamount, paymentstatus;
    `);
    
    const invoice = result.rows[0];
    console.log('✅ Created TEST INVOICE:');
    console.log(`   ID: ${invoice.invoiceid}`);
    console.log(`   Number: ${invoice.invoicenumber}`);
    console.log(`   Amount: ₹${invoice.totalamount}`);
    console.log(`   Status: ${invoice.paymentstatus}`);
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

createTestInvoice();
