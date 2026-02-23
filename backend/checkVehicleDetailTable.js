const pool = require('./config/db');

async function checkTables() {
  try {
    console.log('Checking for VehicleDetail table...');
    const result = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'VehicleDetail')"
    );
    
    const exists = result.rows[0].exists;
    console.log('VehicleDetail table exists:', exists);
    
    if (!exists) {
      console.log('\nVehicleDetail table does NOT exist. Creating it now...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE VehicleDetail (
          VehicleDetailID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          CustomerID INTEGER NOT NULL,
          VehicleNumber VARCHAR(50) NOT NULL,
          VehicleModel VARCHAR(255) NOT NULL,
          VehicleColor VARCHAR(50) NOT NULL,
          ExtraVar1 VARCHAR(100) NULL,
          ExtraVar2 VARCHAR(100) NULL,
          ExtraInt1 INTEGER NULL,
          CreatedBy INTEGER NOT NULL,
          CreatedAt DATE NOT NULL,
          UpdatedBy INTEGER NULL,
          UpdatedAt DATE NULL,
          DeletedBy INTEGER NULL,
          DeletedAt DATE NULL,
          CONSTRAINT fk_vehicledetail_customer
            FOREIGN KEY (CustomerID)
            REFERENCES CustomerMaster (CustomerID)
            ON DELETE CASCADE
        )
      `);
      
      console.log('VehicleDetail table created successfully!');
    } else {
      console.log('VehicleDetail table already exists.');
      
      // Check columns
      const columns = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'VehicleDetail' ORDER BY ordinal_position"
      );
      console.log('\nVehicleDetail columns:');
      columns.rows.forEach(col => console.log('  -', col.column_name));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
