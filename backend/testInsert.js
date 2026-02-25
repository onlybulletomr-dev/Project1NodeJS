const pool = require('./config/db');

async function testInsert() {
  try {
    const query = `
      INSERT INTO paymentdetail (
        invoiceid,
        vehicleid,
        paymentmethodid,
        processedbyuserid,
        branchid,
        paymentdate,
        amount,
        transactionreference,
        paymentstatus,
        notes,
        extravar1,
        extravar2,
        extraint1,
        createdby,
        createdat
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()::DATE)
      RETURNING *
    `;

    const values = [
      54,    // invoiceid
      null,  // vehicleid
      1,     // paymentmethodid
      1,     // processedbyuserid
      1,     // branchid
      '2026-02-25', // paymentdate
      500,   // amount
      'TEST001', // transactionreference
      'Completed', // paymentstatus
      'Test payment', // notes
      null,  // extravar1
      null,  // extravar2
      null,  // extraint1
      1,     // createdby
    ];

    console.log('Testing INSERT...');
    console.log('Query columns:', 15);
    console.log('Values count:', values.length);
    
    const result = await pool.query(query, values);
    console.log('INSERT successful!');
    console.log('Returned row:', result.rows[0]);
  } catch (err) {
    console.error('INSERT failed:', err.message);
    console.error('Error code:', err.code);
    console.error('Error position:', err.position);
  }
  process.exit(0);
}

testInsert();
