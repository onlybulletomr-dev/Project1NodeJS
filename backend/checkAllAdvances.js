const pool = require('./config/db');

async function checkAdvances() {
  try {
    // Get all records with current data
    const result = await pool.query(
      'SELECT paymentreceivedid, invoiceid, vehicleid, amount, paymentdate, notes FROM paymentdetail ORDER BY paymentreceivedid DESC LIMIT 15'
    );
    
    console.log('LAST 15 PAYMENT RECORDS:');
    console.log('========================\n');
    
    result.rows.forEach((row, i) => {
      const type = row.invoiceid === null ? '🔶 ADVANCE' : '📄 INVOICE';
      const inv = row.invoiceid === null ? 'NULL' : row.invoiceid;
      console.log(`${i+1}. ${type}`);
      console.log(`   ID: ${row.paymentreceivedid}`);
      console.log(`   Invoice: ${inv}`);
      console.log(`   Vehicle: ${row.vehicleid}`);
      console.log(`   Amount: ₹${row.amount}`);
      console.log(`   Date: ${row.paymentdate}`);
      console.log(`   Notes: ${row.notes || 'N/A'}`);
      console.log('');
    });

    // Count records with invoiceid=NULL
    const advanceCount = await pool.query(
      'SELECT COUNT(*) as total FROM paymentdetail WHERE invoiceid IS NULL'
    );
    
    console.log(`\n📊 TOTAL ADVANCE RECORDS (invoiceid=NULL): ${advanceCount.rows[0].total}`);

    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

checkAdvances();
