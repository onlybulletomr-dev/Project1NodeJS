const pool = require('./config/db');

async function addPaymentDetailColumns() {
  try {
    console.log('Checking PaymentDetail table structure...');

    // Check if vehicleid column exists
    const checkVehicleID = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'paymentdetail' AND column_name = 'vehicleid'
    `);

    if (checkVehicleID.rows.length === 0) {
      console.log('Adding vehicleid column...');
      await pool.query(`
        ALTER TABLE paymentdetail 
        ADD COLUMN vehicleid INTEGER NULL
      `);
      console.log('✓ vehicleid column added');
    } else {
      console.log('✓ vehicleid column already exists');
    }

    // Add foreign key constraints if they don't exist
    console.log('\nChecking foreign key constraints...');

    // Check vehicle FK
    const checkVehicleFK = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'paymentdetail' AND constraint_name = 'fk_payment_detail_vehicle'
    `);

    if (checkVehicleFK.rows.length === 0) {
      console.log('Adding foreign key constraint for vehicleid...');
      await pool.query(`
        ALTER TABLE paymentdetail
        ADD CONSTRAINT fk_payment_detail_vehicle
        FOREIGN KEY (vehicleid)
        REFERENCES vehicledetail(vehicledetailid)
        ON DELETE RESTRICT
      `);
      console.log('✓ vehicleid foreign key added');
    } else {
      console.log('✓ vehicleid foreign key already exists');
    }

    console.log('\n✓ All columns and constraints are in place!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
}

addPaymentDetailColumns();
