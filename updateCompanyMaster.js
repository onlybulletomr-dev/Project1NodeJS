const pool = require('./backend/config/db');

async function updateCompanyMaster() {
  try {
    console.log('Updating company master with bank details...');
    
    const result = await pool.query(
      `UPDATE companymaster 
       SET 
         bankname = 'Indian Bank',
         bankaccountnumber = '344002000285538',
         bankswiftcode = 'IOBA0003400',
         addressline1 = 'Near HP Petrol Bunk',
         addressline2 = 'Saidapet',
         city = 'Chennai',
         state = 'Tamil Nadu',
         postalcode = '600015'
       WHERE companyid = 1
       RETURNING companyname, bankname, bankaccountnumber, bankswiftcode, addressline1, addressline2, city, state, postalcode`
    );

    console.log('✅ Updated successfully!');
    if (result.rows.length > 0) {
      console.log('Result:', JSON.stringify(result.rows[0], null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateCompanyMaster();
