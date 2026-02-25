const { Pool } = require('pg');
require('dotenv').config();

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: process.env.RENDER_DB_PORT || 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('\n=== RENDER DATABASE DATA ===\n');
    
    const customers = await renderPool.query('SELECT customerid, firstname, lastname FROM customermaster ORDER BY customerid');
    console.log(`Found ${customers.rows.length} customers:`);
    customers.rows.forEach(c => console.log(`  [${c.customerid}] ${c.firstname} ${c.lastname}`));
    
    console.log('\n');
    const vehicles = await renderPool.query('SELECT vehicleid, registrationnumber, model FROM vehicledetail ORDER BY vehicleid');
    console.log(`Found ${vehicles.rows.length} vehicles:`);
    vehicles.rows.forEach(v => console.log(`  [${v.vehicleid}] ${v.registrationnumber} (${v.model})`));
    
    console.log('\n');
    const invoices = await renderPool.query('SELECT invoiceid, invoicenumber, customerid, vehicleid FROM invoicemaster ORDER BY invoiceid');
    console.log(`Found ${invoices.rows.length} invoices:`);
    invoices.rows.forEach(i => console.log(`  [${i.invoiceid}] ${i.invoicenumber} - Customer:${i.customerid} Vehicle:${i.vehicleid}`));
    
    renderPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    renderPool.end();
  }
})();
