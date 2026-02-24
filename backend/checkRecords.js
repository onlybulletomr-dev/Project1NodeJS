const pool = require('./config/db');

async function check() {
  try {
    // Check specific records
    const result = await pool.query(
      'SELECT paymentreceivedid, invoiceid, vehicleid, amount FROM paymentdetail WHERE paymentreceivedid IN (29, 30, 31, 32) ORDER BY paymentreceivedid'
    );
    
    console.log('CHECKING RECORDS 29-32:');
    console.log('=======================\n');
    
    if (result.rows.length === 0) {
      console.log('❌ NO RECORDS FOUND (29-32)');
    } else {
      result.rows.forEach(row => {
        const type = row.invoiceid === null ? '🔶 ADVANCE' : '📄 INVOICE';
        console.log(`${type} Record ${row.paymentreceivedid}: Invoice=${row.invoiceid}, Vehicle=${row.vehicleid}, Amount=${row.amount}`);
      });
    }

    // Check ALL records
    console.log('\n\nALL PAYMENT RECORDS:');
    console.log('====================\n');
    
    const all = await pool.query('SELECT paymentreceivedid, invoiceid, vehicleid, amount FROM paymentdetail ORDER BY paymentreceivedid');
    all.rows.forEach(row => {
      const type = row.invoiceid === null ? '🔶' : '📄';
      console.log(`${type} ID=${row.paymentreceivedid} | Invoice=${row.invoiceid} | Vehicle=${row.vehicleid} | Amount=${row.amount}`);
    });

    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

check();
