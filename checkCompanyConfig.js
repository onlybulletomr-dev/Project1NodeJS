const pool = require('./backend/config/db');

async function checkCompanyConfig() {
  try {
    console.log('Fetching company config from database...\n');
    
    const result = await pool.query(
      `SELECT 
        companyid,
        companyname,
        addressline1,
        addressline2,
        city,
        state,
        postalcode,
        country,
        phonenumber1,
        phonenumber2,
        emailaddress
       FROM companymaster 
       WHERE deletedat IS NULL`
    );

    console.log('All Companies in Database:');
    console.log('===========================\n');
    
    result.rows.forEach(company => {
      console.log(`ID: ${company.companyid}`);
      console.log(`Name: ${company.companyname}`);
      console.log(`Address1: ${company.addressline1 || '(empty)'}`);
      console.log(`Address2: ${company.addressline2 || '(empty)'}`);
      console.log(`City: ${company.city || '(empty)'}`);
      console.log(`State: ${company.state || '(empty)'}`);
      console.log(`Postal Code: ${company.postalcode || '(empty)'}`);
      console.log(`Country: ${company.country || '(empty)'}`);
      console.log(`Phone1: ${company.phonenumber1 || '(empty)'}`);
      console.log(`Phone2: ${company.phonenumber2 || '(empty)'}`);
      console.log(`Email: ${company.emailaddress || '(empty)'}`);
      console.log('---\n');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCompanyConfig();
