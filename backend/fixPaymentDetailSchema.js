const pool = require('./config/db');

async function fixPaymentDetailSchema() {
  try {
    console.log('Fixing paymentdetail table schema...');
    console.log('Allowing NULL values for invoiceid column...\n');

    // Drop the NOT NULL constraint on invoiceid
    // First, create a new table with the correct schema
    const dropConstraintQuery = `
      ALTER TABLE paymentdetail
      ALTER COLUMN invoiceid DROP NOT NULL;
    `;

    await pool.query(dropConstraintQuery);
    console.log('✓ invoiceid column now allows NULL values');

    console.log('\n✓ Schema fixed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('✓ Constraint already allows NULL (no NOT NULL constraint found)');
      process.exit(0);
    }
    console.error('Error fixing schema:', error.message);
    process.exit(1);
  }
}

fixPaymentDetailSchema();
