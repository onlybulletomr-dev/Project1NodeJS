const http = require('http');

// Test API endpoint for Pending invoices
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/payments/invoices?status=Pending',
  method: 'GET',
  headers: {
    'x-user-id': '1'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Response:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.data && jsonData.data.length > 0) {
        console.log('\n=== First Invoice Details ===');
        const invoice = jsonData.data[0];
        console.log(`Invoice Number: ${invoice.invoicenumber}`);
        console.log(`Total Amount: ${invoice.totalamount}`);
        console.log(`Amount Paid: ${invoice.amountpaid}`);
        console.log(`Amount To Be Paid: ${invoice.amounttobepaid}`);
        console.log(`Payment Status: ${invoice.paymentstatus}`);
      } else {
        console.log('No invoices returned in response');
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.end();
