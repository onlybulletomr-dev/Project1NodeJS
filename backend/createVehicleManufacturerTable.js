const pool = require('./config/db');

async function createVehicleManufacturerTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS vehiclemanufacturer (
      manufacturerid SERIAL PRIMARY KEY,
      manufacturername VARCHAR(255) NOT NULL,
      modelname VARCHAR(255) NOT NULL,
      extravar1 VARCHAR(100),
      extravar2 VARCHAR(100),
      extraint1 INTEGER,
      createdby INTEGER NOT NULL,
      createdat DATE NOT NULL,
      updatedby INTEGER,
      updatedat DATE,
      deletedby INTEGER,
      deletedat DATE
    );
  `;

  try {
    console.log('Creating vehiclemanufacturer table if it does not exist...');
    await pool.query(createTableQuery);
    console.log('✓ vehiclemanufacturer table created or already exists');
  } catch (err) {
    console.error('Error creating vehiclemanufacturer table:', err.message);
    throw err;
  }
}

async function createVehicleDetailTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS vehicledetail (
      vehicledetailid SERIAL PRIMARY KEY,
      customerid INTEGER NOT NULL,
      registrationnumber VARCHAR(50) NOT NULL,
      vehiclemasterid INTEGER NOT NULL,
      color VARCHAR(50) NOT NULL,
      chassisnumber VARCHAR(100),
      enginenumber VARCHAR(100),
      manufacturingyear INTEGER,
      purchasedate DATE,
      extravar1 VARCHAR(100),
      extravar2 VARCHAR(100),
      extraint1 INTEGER,
      createdby INTEGER NOT NULL,
      createdat DATE NOT NULL,
      updatedby INTEGER,
      updatedat DATE,
      deletedby INTEGER,
      deletedat DATE,
      CONSTRAINT fk_vehicledetail_customer
        FOREIGN KEY (customerid)
        REFERENCES customermaster (customerid)
        ON DELETE CASCADE,
      CONSTRAINT fk_vehicledetail_manufacturer
        FOREIGN KEY (vehiclemasterid)
        REFERENCES vehiclemanufacturer (manufacturerid)
        ON DELETE SET NULL
    );
  `;

  try {
    console.log('Creating vehicledetail table if it does not exist...');
    await pool.query(createTableQuery);
    console.log('✓ vehicledetail table created or already exists');
  } catch (err) {
    console.error('Error creating vehicledetail table:', err.message);
    throw err;
  }
}

async function main() {
  try {
    console.log('Starting table creation process...');
    await createVehicleManufacturerTable();
    await createVehicleDetailTable();
    console.log('\n✓ All tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error during table creation:', err);
    process.exit(1);
  }
}

main();
