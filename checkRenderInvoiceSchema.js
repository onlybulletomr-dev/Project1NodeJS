#!/usr/bin/env node

/**
 * Check Render invoicemaster table schema and test insert
 */

const pool = require('./backend/config/db');

async function checkInvoiceSchema() {
  console.log('=== CHECKING RENDER INVOICEMASTER SCHEMA ===\n');

  try {
    // Get all columns for invoicemaster
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoicemaster' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const schemaResult = await pool.query(schemaQuery);
    
    console.log('📋 INVOICEMASTER TABLE COLUMNS:');
    console.log('─'.repeat(80));
    schemaResult.rows.forEach((col, idx) => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      const hasDefault = col.column_default ? `(Default: ${col.column_default})` : '';
      console.log(`${idx + 1}. ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | Null: ${nullable} ${hasDefault}`);
    });

    console.log('\n📊 TOTAL COLUMNS:', schemaResult.rows.length);

    // Check if required columns exist
    const requiredColumns = [
      'invoicemaster', 'invoicenumber', 'branchid', 'customerid', 'vehicleid',
      'jobcardid', 'invoicedate', 'invoicetype', 'subtotal', 'totaldiscount',
      'partsincome', 'serviceincome', 'tax1', 'tax2', 'totalamount',
      'technicianmain', 'technicianassistant', 'waterwash', 'serviceadvisorin',
      'serviceadvisordeliver', 'testdriver', 'cleaner', 'additionalwork',
      'odometer', 'notes', 'notes1', 'paymentstatus', 'createdby', 'createdat'
    ];

    const existingColumns = schemaResult.rows.map(c => c.column_name.toLowerCase());
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col.toLowerCase()));
    
    if (missingColumns.length > 0) {
      console.log('\n⚠️  MISSING COLUMNS:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ All required columns exist');
    }

    // Test a sample insert with actual values
    console.log('\n🧪 TESTING INSERT WITH MINIMAL DATA...\n');

    const testData = {
      invoicenumber: 'TEST-' + Date.now(),
      branchid: 1,
      customerid: 5,
      vehicleid: 5,
      vehiclenumber: 'TN 14 B 7979',
      jobcardid: 1233,
      invoicedate: new Date().toISOString().split('T')[0],
      invoicetype: 'Service Invoice',
      subtotal: 1500.00,
      totaldiscount: 0,
      partsincome: 1500.00,
      serviceincome: 0,
      tax1: 0,
      tax2: 0,
      totalamount: 1500.00,
      technicianmain: null,
      technicianassistant: null,
      waterwash: null,
      serviceadvisorin: null,
      serviceadvisordeliver: null,
      testdriver: null,
      cleaner: null,
      additionalwork: null,
      odometer: null,
      notes: 'Test invoice',
      notes1: null,
      paymentstatus: 'Unpaid',
      createdby: 1,
      createdat: new Date().toISOString().split('T')[0]
    };

    console.log('Test data:', JSON.stringify(testData, null, 2));

    const insertQuery = `
      INSERT INTO invoicemaster (
        invoicenumber, branchid, customerid, vehicleid, vehiclenumber, jobcardid,
        invoicedate, invoicetype,
        subtotal, totaldiscount, partsincome, serviceincome, tax1, tax2, totalamount,
        technicianmain, technicianassistant, waterwash, serviceadvisorin, serviceadvisordeliver,
        testdriver, cleaner, additionalwork,
        odometer, notes, notes1, paymentstatus, createdby, createdat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING invoiceid, invoicenumber
    `;

    const insertValues = [
      testData.invoicenumber, testData.branchid, testData.customerid, testData.vehicleid,
      testData.vehiclenumber, testData.jobcardid, testData.invoicedate, testData.invoicetype,
      testData.subtotal, testData.totaldiscount, testData.partsincome, testData.serviceincome,
      testData.tax1, testData.tax2, testData.totalamount,
      testData.technicianmain, testData.technicianassistant, testData.waterwash, testData.serviceadvisorin,
      testData.serviceadvisordeliver, testData.testdriver, testData.cleaner, testData.additionalwork,
      testData.odometer, testData.notes, testData.notes1, testData.paymentstatus, testData.createdby, testData.createdat
    ];

    const result = await pool.query(insertQuery, insertValues);
    console.log('\n✅ INSERT SUCCESSFUL!');
    console.log('Created record:', result.rows[0]);

    // Cleanup
    await pool.query('DELETE FROM invoicemaster WHERE invoicenumber = $1', [testData.invoicenumber]);
    console.log('\n✓ Cleanup completed (test record deleted)');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:');
    console.error(error);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔗 Connection failed. Checking connection string...');
    }
  }

  await pool.end();
  process.exit(0);
}

checkInvoiceSchema();
