const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

router.post('/seed', async (req, res) => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const client = await pool.connect();

    // Insert test customers
    await client.query(`
      INSERT INTO customermaster (firstname, lastname, mobilenumber1) VALUES
      ('Vikram', 'Singh', '9876543214'),
      ('Rahul', 'Sharma', '9876543210'),
      ('Priya', 'Nair', '9876543211'),
      ('Amit', 'Verma', '9876543212')
      ON CONFLICT DO NOTHING;
    `);

    // Insert test vehicles
    await client.query(`
      INSERT INTO vehicledetail (vehiclenumber, vehiclemodel, vehiclecolor, customerid) VALUES
      ('DL01AB1234', 'Car', 'Maruti', 'Swift'),
      ('MH02CD5678', 'Car', 'Honda', 'City'),
      ('KA03EF9012', 'Car', 'Hyundai', 'i20'),
      ('TN04GH3456', 'Car', 'Tata', 'Nexon')
      ON CONFLICT DO NOTHING;
    `);

    // Insert test invoices
    await client.query(`
      INSERT INTO invoicemaster (invoicenumber, customerid, vehicleid, vehiclenumber, invoicedate, totalamount, paymentstatus) VALUES
      ('INV26FEB001', 1, 1, 'DL01AB1234', '2026-02-20', 13070, 'Unpaid'),
      ('INV26FEB002', 2, 2, 'MH02CD5678', '2026-02-20', 2085, 'Unpaid'),
      ('INV26FEB003', 3, 3, 'KA03EF9012', '2026-02-20', 890, 'Unpaid'),
      ('INV26FEB004', 4, 4, 'TN04GH3456', '2026-02-20', 890, 'Unpaid')
      ON CONFLICT DO NOTHING;
    `);

    client.release();
    res.json({ success: true, message: 'Test data seeded successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await pool.end();
  }
});

module.exports = router;
