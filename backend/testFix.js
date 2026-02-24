const pool = require('./config/db');

async function testFix() {
  try {
    console.log('=== VERIFYING FIX ===\n');

    // 1. Reset invoice 34 to Unpaid
    await pool.query("UPDATE invoicemaster SET paymentstatus = $1 WHERE invoiceid = $2", ['Unpaid', 34]);
    console.log('✓ Invoice 34 reset to Unpaid');

    // 2. Make payment with correct total amount
    console.log('\n2. Testing payment with TOTAL amount (not allocation)...');
    const http = require('http');

    const paymentData = {
      PaymentStatus: 'Paid',
      PaymentDate: new Date().toISOString().split('T')[0],
      PaymentMethodID: 2,
      Amount: 1590,  // Total payment (overpay by 300)
      TransactionReference: 'FIX-TEST-' + Date.now(),
      Notes: 'Test after fix'
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
    } else {
      console.log('✗ Payment API failed:', result.message);
    }

    // 3. Check database for advance payment
    console.log('\n3. Checking for advance payment record...');
    const advanceCheck = await pool.query(`
      SELECT paymentreceivedid, invoiceid, vehicleid, amount, notes, createdat
      FROM paymentdetail
      WHERE invoiceid IS NULL AND amount = 300
      ORDER BY paymentreceivedid DESC
      LIMIT 1
    `);

    if (advanceCheck.rows.length > 0) {
      const adv = advanceCheck.rows[0];
      console.log(`✓ ADVANCE PAYMENT FOUND!`);
      console.log(`  - ID: ${adv.paymentreceivedid}`);
      console.log(`  - Amount: ₹${adv.amount}`);
      console.log(`  - Invoice: ${adv.invoiceid} (NULL = advance)`);
      console.log(`  - Notes: ${adv.notes}`);
      console.log(`  - Created: ${adv.createdat}`);
    } else {
      console.log('✗ NO ADVANCE PAYMENT FOUND');
    }

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

testFix();
