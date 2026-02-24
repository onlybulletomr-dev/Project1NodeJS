const http = require('http');

const paymentData = {
  PaymentStatus: 'Paid',
  PaymentMethodID: 1,  // Cash
  Amount: 1800,  // Overpay by ₹300
  TransactionReference: 'TEST-' + Date.now(),
  Notes: 'Test payment with advance'
};

const postData = JSON.stringify(paymentData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/payments/36',  // Invoice ID 36
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    'x-user-id': '1'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2));
    } catch(e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

console.log('🔷 Sending payment request...');
console.log(`   Invoice ID: ${paymentData.InvoiceID}`);
console.log(`   Amount: ₹${paymentData.Amount}`);
console.log(`   Overpayment: ₹${paymentData.Amount - 1500}`);
console.log();

req.write(postData);
req.end();
