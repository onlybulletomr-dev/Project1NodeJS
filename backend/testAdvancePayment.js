const pool = require('./config/db');

async function testAdvancePayment() {
  try {
    // Get an unpaid invoice
    const invoiceResult = await pool.query(
      'SELECT invoiceid, invoicenumber, totalamount, vehicleid FROM invoicemaster ' +
      'WHERE paymentstatus = $1 AND deletedat IS NULL LIMIT 1',
      ['Unpaid']
    );

    if (invoiceResult.rows.length === 0) {
      console.log('❌ No unpaid invoices found');
      process.exit(0);
    }

    const invoice = invoiceResult.rows[0];
    console.log('\n📋 INVOICE DETAILS:');
    console.log('  ID:', invoice.invoiceid);
    console.log('  Number:', invoice.invoicenumber);
    console.log('  Amount:', invoice.totalamount);
    console.log('  VehicleID:', invoice.vehicleid);

    // Test: Pay MORE than invoice amount to trigger advance payment
    const paymentAmount = parseFloat(invoice.totalamount) + 500; // +500 as advance
    console.log('\n💳 TEST PAYMENT:');
    console.log('  Amount to pay:', paymentAmount);
    console.log('  Invoice amount:', invoice.totalamount);
    console.log('  Expected advance:', paymentAmount - invoice.totalamount);

    // Make the payment via API
    const paymentData = {
      InvoiceID: invoice.invoiceid,
      Amount: paymentAmount,
      PaymentMethodID: 1,
      PaymentStatus: 'Paid'
    };

    console.log('\n📤 Making payment request...');
    const response = await fetch('http://localhost:5000/api/payments/' + invoice.invoiceid, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    // Wait a moment then check database
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if both regular and advance payments were created
    const paymentResult = await pool.query(
      'SELECT paymentreceivedid, invoiceid, vehicleid, amount FROM paymentdetail ' +
      'WHERE vehicleid = $1 ORDER BY paymentreceivedid DESC LIMIT 5',
      [invoice.vehicleid]
    );

    console.log('\n📊 PAYMENTS IN DATABASE:');
    if (paymentResult.rows.length === 0) {
      console.log('❌ NO PAYMENTS FOUND');
    } else {
      paymentResult.rows.forEach((row, i) => {
        const type = row.invoiceid === null ? '🔶 ADVANCE' : '📄 INVOICE';
        const inv = row.invoiceid === null ? 'NULL' : row.invoiceid;
        console.log(`${i + 1}. ${type} | ID=${row.paymentreceivedid} | InvoiceID=${inv} | Amount=${row.amount}`);
      });
    }

    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

testAdvancePayment();
