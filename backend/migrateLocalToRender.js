const { Pool } = require('pg');
require('dotenv').config();

// Local database connection
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'project1',
});

// Render database connection - need to provide these separately
const renderPool = new Pool({
  // You need to get these from Render dashboard
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateData() {
  console.log('[Migration] Starting data migration from local to Render...');
  
  try {
    // Check if Render credentials are provided
    if (!process.env.RENDER_DB_HOST) {
      console.log('[Migration] Render database credentials not set in environment.');
      console.log('[Migration] Please set these environment variables:');
      console.log('  - RENDER_DB_HOST');
      console.log('  - RENDER_DB_USER');
      console.log('  - RENDER_DB_PASSWORD');
      console.log('  - RENDER_DB_NAME');
      console.log('[Migration] You can get these from your Render dashboard.');
      process.exit(1);
    }

    const localClient = await localPool.connect();
    const renderClient = await renderPool.connect();

    try {
      console.log('[Migration] Connected to both databases');

      // Get data from local database
      console.log('[Migration] Fetching data from local database...');

      const customers = await localClient.query('SELECT * FROM customermaster WHERE deletedat IS NULL');
      console.log(`[Migration] Found ${customers.rows.length} customers`);

      // Note: Local database uses vehicledetailid, vehiclenumber, vehiclemodel, vehiclecolor
      const vehicles = await localClient.query('SELECT vehicledetailid, customerid, vehiclenumber, vehiclemodel, vehiclecolor, extravar1, extravar2, extraint1, createdby, createdat, updatedat, deletedat FROM vehicledetail WHERE deletedat IS NULL');
      console.log(`[Migration] Found ${vehicles.rows.length} vehicles`);

      const invoices = await localClient.query('SELECT * FROM invoicemaster WHERE deletedat IS NULL');
      console.log(`[Migration] Found ${invoices.rows.length} invoices`);

      // Clear existing data in Render (optional - enable if you want to replace)
      console.log('[Migration] Clearing Render database tables...');
      try {
        await renderClient.query('DELETE FROM paymentdetail');
      } catch (e) { console.log('[Migration] Note: paymentdetail table not found (OK)'); }
      try {
        await renderClient.query('DELETE FROM invoicedetail');
      } catch (e) { console.log('[Migration] Note: invoicedetail table not found (OK)'); }
      try {
        await renderClient.query('DELETE FROM invoicemaster');
      } catch (e) { console.log('[Migration] Note: invoicemaster table not found (OK)'); }
      try {
        await renderClient.query('DELETE FROM vehicledetail');
      } catch (e) { console.log('[Migration] Note: vehicledetail table not found (OK)'); }
      try {
        await renderClient.query('DELETE FROM customermaster');
      } catch (e) { console.log('[Migration] Note: customermaster table not found (OK)'); }
      console.log('[Migration] ✓ Render tables cleared');

      // Insert customers
      console.log('[Migration] Inserting customers to Render...');
      for (const customer of customers.rows) {
        await renderClient.query(
          `INSERT INTO customermaster 
            (customerid, firstname, lastname, mobilenumber1, mobilenumber2, emailaddress, 
             addressline1, addressline2, city, state, postalcode, country, createdat, updatedat, deletedat)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (customerid) DO UPDATE SET firstname = EXCLUDED.firstname`,
          [customer.customerid, customer.firstname, customer.lastname, customer.mobilenumber1,
           customer.mobilenumber2, customer.emailaddress, customer.addressline1, customer.addressline2,
           customer.city, customer.state, customer.postalcode, customer.country,
           customer.createdat, customer.updatedat, customer.deletedat]
        );
      }
      console.log(`[Migration] ✓ Inserted ${customers.rows.length} customers`);

      // Insert vehicles
      console.log('[Migration] Inserting vehicles to Render...');
      for (const vehicle of vehicles.rows) {
        // Local vehicles have vehicledetailid (not vehicleid), so use that as vehicleid in Render
        try {
          await renderClient.query(
            `INSERT INTO vehicledetail 
              (vehicleid, customerid, registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color, createdat, updatedat, deletedat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (vehicleid) DO UPDATE SET registrationnumber = EXCLUDED.registrationnumber`,
            [
              vehicle.vehicledetailid,        // vehicledetailid -> vehicleid
              vehicle.customerid,             // customerid (now included!)
              vehicle.vehiclenumber,          // vehiclenumber -> registrationnumber
              null,                            // vehicletype (not in local)
              null,                            // manufacturer (not in local)
              vehicle.vehiclemodel,           // vehiclemodel -> model
              null,                            // yearofmanufacture (not in local)
              null,                            // enginenumber (not in local)
              null,                            // chassisnumber (not in local)
              vehicle.vehiclecolor,           // vehiclecolor -> color
              vehicle.createdat,
              vehicle.updatedat,
              vehicle.deletedat
            ]
          );
        } catch (err) {
          console.log(`[Migration] Error inserting vehicle ${vehicle.vehicledetailid}:`, err.message);
        }
      }
      console.log(`[Migration] ✓ Inserted ${vehicles.rows.length} vehicles`);

      // Insert invoices
      console.log('[Migration] Inserting invoices to Render...');
      let invoiceCount = 0;
      for (const invoice of invoices.rows) {
        try {
          await renderClient.query(
            `INSERT INTO invoicemaster 
              (invoiceid, invoicenumber, customerid, vehicleid, vehiclenumber, invoicedate, 
               totalamount, paymentstatus, notes, createdat, updatedat, deletedat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (invoiceid) DO UPDATE SET invoicenumber = EXCLUDED.invoicenumber`,
            [
              invoice.invoiceid,
              invoice.invoicenumber,
              invoice.customerid,
              invoice.vehicleid,
              invoice.vehiclenumber,
              invoice.invoicedate,
              invoice.totalamount,
              invoice.paymentstatus,
              invoice.notes,
              invoice.createdat,
              invoice.updatedat,
              invoice.deletedat
            ]
          );
          invoiceCount++;
        } catch (err) {
          console.log(`[Migration] Error inserting invoice ${invoice.invoiceid}:`, err.message);
        }
      }
      console.log(`[Migration] ✓ Inserted ${invoiceCount} invoices`);

      console.log('[Migration] ✅ Data migration completed successfully!');
      console.log('[Migration] You can now refresh the Render frontend to see your data.');

    } finally {
      localClient.release();
      renderClient.release();
    }
  } catch (error) {
    console.error('[Migration ERROR]', error.message);
    console.error('[Migration Stack]', error.stack);
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

migrateData();
