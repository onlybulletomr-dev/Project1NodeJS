const http = require('http');

async function testPaymentAPI() {
  try {
    console.log('=== TESTING ADVANCE PAYMENT VIA API ===\n');

    // 1. Get unpaid invoices first
    console.log('1. Getting unpaid invoices...');
    const getUnpaid = new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments/unpaid',
        method: 'GET',
        headers: {
          'x-user-id': '1',
          'Content-Type': 'application/json'
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
      req.end();
    });

    const unpaidResponse = await getUnpaid;
    
    if (!unpaidResponse.success || unpaidResponse.data.length === 0) {
      console.log('No unpaid invoices found');
      process.exit(0);
    }

    const invoice = unpaidResponse.data[0];
    console.log(`✓ Invoice: ID=${invoice.invoiceid}, Amount=₹${invoice.totalamount}`);

    // 2. Make payment with overpayment
    console.log(`\n2. Recording payment of ₹${Number(invoice.totalamount) + 300} (overpay by ₹300)...`);

    const paymentData = {
      PaymentStatus: 'Paid',
      PaymentDate: new Date().toISOString().split('T')[0],
      PaymentMethodID: 2,
      Amount: Number(invoice.totalamount) + 300,
      TransactionReference: 'TEST-' + Date.now(),
      Notes: 'Test advance payment'
    };

    const makePayment = new Promise((resolve, reject) => {
      const postData = JSON.stringify(paymentData);
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/payments/${invoice.invoiceid}`,
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
            console.log(`[API Response] Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
            console.log(`[API Response] Body (first 200 chars): ${data.substring(0, 200)}`);
            resolve(JSON.parse(data));
          } catch (e) {
            console.error(`[API Error] Failed to parse response: ${e.message}`);
            console.error(`[API Response Body]:`, data);
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const paymentResponse = await makePayment;
    console.log('✓ Payment API response:', JSON.stringify(paymentResponse, null, 2));

    // 3. Query database for advance payments
    console.log('\n3. Checking database for advance payments...');
    const pool = require('./config/db');
    const advanceCheck = await pool.query(`
      SELECT paymentreceivedid, invoiceid, vehicleid, amount, notes, createdat
      FROM paymentdetail
      WHERE invoiceid IS NULL
      ORDER BY paymentreceivedid DESC
      LIMIT 3
    `);

    console.log(`\n✓ Found ${advanceCheck.rows.length} advance payment records:`);
    advanceCheck.rows.forEach(row => {
      console.log(`  - ID=${row.paymentreceivedid} | Amount=₹${row.amount} | Vehicle=${row.vehicleid} | Date=${row.createdat}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPaymentAPI();
