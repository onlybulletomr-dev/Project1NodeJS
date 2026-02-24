const http = require('http');

// Get unpaid invoices first
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testMultiInvoicePayment() {
  try {
    console.log('========================================');
    console.log('MULTI-INVOICE PAYMENT TEST');
    console.log('========================================\n');

    // Step 1: Get unpaid invoices to find 2 invoices for testing
    console.log('Step 1: Getting unpaid invoices...');
    const unpaidResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/payments/unpaid',
      method: 'GET'
    });

    if (unpaidResponse.status !== 200) {
      console.error('Failed to get unpaid invoices:', unpaidResponse.data);
      return;
    }

    const unpaidInvoices = unpaidResponse.data.data;
    console.log(`Found ${unpaidInvoices.length} unpaid invoices`);
    
    // Find 2 invoices from the same vehicle with different amounts
    let selectedInvoices = [];
    let vehicleId = null;
    let vehicleInvoices = {};

    unpaidInvoices.forEach(inv => {
      if (!vehicleInvoices[inv.vehicleid]) {
        vehicleInvoices[inv.vehicleid] = [];
      }
      vehicleInvoices[inv.vehicleid].push(inv);
    });

    // Find a vehicle with at least 2 unpaid invoices
    for (let vid in vehicleInvoices) {
      if (vehicleInvoices[vid].length >= 2) {
        vehicleId = vid;
        selectedInvoices = vehicleInvoices[vid].slice(0, 2);
        break;
      }
    }

    if (selectedInvoices.length < 2) {
      console.error('Could not find 2 unpaid invoices for the same vehicle');
      console.log('Available vehicles and invoices:');
      for (let vid in vehicleInvoices) {
        console.log(`  Vehicle ${vid}: ${vehicleInvoices[vid].length} unpaid invoice(s)`);
      }
      return;
    }

    console.log(`\nSelected 2 invoices from Vehicle ${vehicleId}:`);
    selectedInvoices.forEach((inv, idx) => {
      console.log(`  Invoice ${idx + 1}: ID=${inv.invoiceid}, Amount=₹${inv.totalamount}`);
    });

    // Step 2: Calculate payment allocations
    const invoice1Amount = Number(selectedInvoices[0].totalamount);
    const invoice2Amount = Number(selectedInvoices[1].totalamount);
    const totalInvoiceAmount = invoice1Amount + invoice2Amount;
    
    // Pay 30% more than invoice total = create advance
    const totalPaymentAmount = Math.round(totalInvoiceAmount * 1.3);
    const advanceExpected = totalPaymentAmount - totalInvoiceAmount;

    console.log(`\nPayment Calculation:`);
    console.log(`  Invoice 1 Amount: ₹${invoice1Amount}`);
    console.log(`  Invoice 2 Amount: ₹${invoice2Amount}`);
    console.log(`  Total Invoice Amount: ₹${totalInvoiceAmount}`);
    console.log(`  Total Payment Amount: ₹${totalPaymentAmount}`);
    console.log(`  Expected Advance: ₹${advanceExpected}`);

    // Step 3: Process payment for Invoice 1
    console.log(`\nStep 2: Processing payment for Invoice 1...`);
    const payment1Response = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/payments/${selectedInvoices[0].invoiceid}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    }, {
      PaymentStatus: 'Paid',
      PaymentDate: new Date().toISOString().split('T')[0],
      Amount: invoice1Amount,
      PaymentMethodID: 1,
      TransactionReference: `TEST_INV1_${Date.now()}`,
      Notes: `Test payment for Invoice ${selectedInvoices[0].invoiceid}`
    });

    if (payment1Response.status !== 200) {
      console.error('Failed to process payment for Invoice 1:', payment1Response.data);
      return;
    }
    console.log('✓ Invoice 1 payment recorded successfully');

    // Step 4: Process payment for Invoice 2
    console.log(`\nStep 3: Processing payment for Invoice 2...`);
    const payment2Response = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/payments/${selectedInvoices[1].invoiceid}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    }, {
      PaymentStatus: 'Paid',
      PaymentDate: new Date().toISOString().split('T')[0],
      Amount: invoice2Amount,
      PaymentMethodID: 1,
      TransactionReference: `TEST_INV2_${Date.now()}`,
      Notes: `Test payment for Invoice ${selectedInvoices[1].invoiceid}`
    });

    if (payment2Response.status !== 200) {
      console.error('Failed to process payment for Invoice 2:', payment2Response.data);
      return;
    }
    console.log('✓ Invoice 2 payment recorded successfully');

    // Step 5: Record Advance Payment
    console.log(`\nStep 4: Recording advance payment...`);
    const advanceResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/payments/advance',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    }, {
      vehicleid: vehicleId,
      amount: advanceExpected,
      paymentmethodid: 1,
      paymentdate: new Date().toISOString().split('T')[0],
      transactionreference: `TEST_ADV_${Date.now()}`,
      notes: `Advance from multi-invoice payment test`
    });

    if (advanceResponse.status !== 200) {
      console.error('Failed to record advance payment:', advanceResponse.data);
      return;
    }
    console.log(`✓ Advance payment of ₹${advanceExpected} recorded successfully`);

    // Step 6: Query database to verify records
    console.log(`\nStep 5: Verifying database records...`);
    const verifyResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/payments/advance/transactions/${vehicleId}`,
      method: 'GET'
    });

    if (verifyResponse.status === 200) {
      const advanceTransactions = verifyResponse.data.data || [];
      console.log(`\nAdvance transactions for Vehicle ${vehicleId}:`);
      advanceTransactions.forEach((trans, idx) => {
        console.log(`  Advance ${idx + 1}: ₹${trans.amount} (ID: ${trans.paymentid})`);
      });
    }

    console.log(`\n========================================`);
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log(`\nExpected Result:`);
    console.log(`  ✓ Invoice ${selectedInvoices[0].invoiceid}: ₹${invoice1Amount} recorded`);
    console.log(`  ✓ Invoice ${selectedInvoices[1].invoiceid}: ₹${invoice2Amount} recorded`);
    console.log(`  ✓ Single Advance: ₹${advanceExpected} recorded`);
    console.log(`\nCheck database to verify 3 records were created (2 invoice payments + 1 advance)`);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testMultiInvoicePayment();
