const pool = require('./config/db');

async function testCorrectRecording() {
  try {
    console.log('=== TESTING CORRECT PAYMENT RECORDING ===\n');

    // 1. Reset invoice 34 to Unpaid
    await pool.query("UPDATE invoicemaster SET paymentstatus = $1 WHERE invoiceid = $2", ['Unpaid', 34]);
    console.log('✓ Invoice 34 reset to Unpaid');

    // 2. Delete any previous test payments
    await pool.query("DELETE FROM paymentdetail WHERE notes LIKE '%Correct test%'");
    console.log('✓ Cleared previous test records');

    // 3. Make payment: Invoice amount 1290, Total payment 2290
    console.log('\n2. Testing payment: Invoice=₹1290, Total Payment=₹2290...');
    const http = require('http');

    const paymentData = {
      PaymentStatus: 'Paid',
      PaymentDate: new Date().toISOString().split('T')[0],
      PaymentMethodID: 2,
      Amount: 2290,  // Total payment
      TransactionReference: 'CORRECT-' + Date.now(),
      Notes: 'Correct test'
    };

    const result = await new Promise((resolve, reject) => {
      const postData = JSON.stringify(paymentData);
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments/34',
        method: 'PUT',
        headers: {
          'x-user-id': '1',
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (result.success) {
      console.log('✓ Payment API response successful');
    }

    // 3. Check records
    console.log('\n3. Checking payment records in database...');
    
    // Check invoice payment
    const invoicePayments = await pool.query(`
      SELECT paymentreceivedid, invoiceid, amount, notes
      FROM paymentdetail
      WHERE invoiceid = 34 AND notes LIKE '%Correct test%'
    `);

    console.log('\nInvoice Payment Records (invoiceid=34):');
    invoicePayments.rows.forEach(row => {
      console.log(`  - ID=${row.paymentreceivedid} | Amount=₹${row.amount} | Notes=${row.notes}`);
    });

    // Check advance payment
    const advancePayments = await pool.query(`
      SELECT paymentreceivedid, invoiceid, amount, notes
      FROM paymentdetail
      WHERE invoiceid IS NULL AND notes LIKE '%Correct test%'
    `);

    console.log('\nAdvance Payment Records (invoiceid=NULL):');
    advancePayments.rows.forEach(row => {
      console.log(`  - ID=${row.paymentreceivedid} | Amount=₹${row.amount} | Notes=${row.notes}`);
    });

    // Summary
    console.log('\n=== SUMMARY ===');
    const invoiceTotal = invoicePayments.rows.reduce((sum, r) => sum + Number(r.amount), 0);
    const advanceTotal = advancePayments.rows.reduce((sum, r) => sum + Number(r.amount), 0);
    const grandTotal = invoiceTotal + advanceTotal;

    console.log(`Invoice Amount: ₹1290.00`);
    console.log(`Total Payment Received: ₹2290.00`);
    console.log(`Expected Advance: ₹1000.00`);
    console.log(`---`);
    console.log(`Invoice Payment Recorded: ₹${invoiceTotal.toFixed(2)}`);
    console.log(`Advance Payment Recorded: ₹${advanceTotal.toFixed(2)}`);
    console.log(`Total Recorded: ₹${grandTotal.toFixed(2)}`);
    console.log(`---`);
    
    if (grandTotal === 2290) {
      console.log('✅ CORRECT! Total matches payment received');
    } else {
      console.log(`❌ ERROR! Total mismatch. Expected 2290, got ${grandTotal}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

testCorrectRecording();
