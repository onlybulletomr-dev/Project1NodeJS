const pool = require('./backend/config/db');

async function addInvoiceDetailIdColumn() {
  try {
    console.log('Checking if invoicedetailid column exists...');
    
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoicedetail' AND column_name = 'invoicedetailid'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ invoicedetailid column already exists');
      process.exit(0);
    }
    
    console.log('❌ invoicedetailid column missing, adding it...');
    
    // Add the column with a sequence (UNIQUE NOT NULL, not PRIMARY KEY since invoiceid+itemid is already PK)
    console.log('Step 1: Adding invoicedetailid SERIAL UNIQUE NOT NULL column...');
    await pool.query(`
      ALTER TABLE invoicedetail 
      ADD COLUMN invoicedetailid SERIAL UNIQUE NOT NULL
    `);
    console.log('✅ Column added with SERIAL UNIQUE NOT NULL');
    
    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoicedetail' AND column_name = 'invoicedetailid'
    `);
    
    console.log('✅ Verification successful:');
    console.log(JSON.stringify(verifyResult.rows[0], null, 2));
    
    // Check the sequence was created
    const seqResult = await pool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_name LIKE '%invoicedetailid%'
    `);
    
    console.log('✅ Auto-increment sequence:');
    console.log(JSON.stringify(seqResult.rows, null, 2));
    
    // Test by selecting a row
    console.log('\nTesting with existing data...');
    const testResult = await pool.query(`
      SELECT invoicedetailid, invoiceid, itemid FROM invoicedetail LIMIT 1
    `);
    
    if (testResult.rows.length > 0) {
      console.log('✅ Sample row now has invoicedetailid:');
      console.log(JSON.stringify(testResult.rows[0], null, 2));
    } else {
      console.log('(No rows in table yet)');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addInvoiceDetailIdColumn();
