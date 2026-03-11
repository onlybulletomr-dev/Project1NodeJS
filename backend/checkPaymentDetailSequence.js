const pool = require('./config/db');

async function checkPaymentDetailStructure() {
  try {
    console.log('=== CHECKING PAYMENTDETAIL TABLE STRUCTURE ===\n');

    // Check table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'paymentdetail'
      ORDER BY ordinal_position
    `;

    console.log('[QUERY] Fetching paymentdetail columns...');
    const columnsResult = await pool.query(columnsQuery);
    console.log('[COLUMNS] Found columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}, nullable=${col.is_nullable}, default=${col.column_default}`);
    });

    // Check sequences
    const sequencesQuery = `
      SELECT sequence_name, data_type
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `;

    console.log('\n[QUERY] Fetching all sequences...');
    const sequencesResult = await pool.query(sequencesQuery);
    console.log('[SEQUENCES] Found sequences:');
    if (sequencesResult.rows.length > 0) {
      sequencesResult.rows.forEach(seq => {
        console.log(`  - ${seq.sequence_name} (${seq.data_type})`);
      });
    } else {
      console.log('  [NO SEQUENCES FOUND]');
    }

    // Check if sequence exists for paymentdetail
    console.log('\n[QUERY] Looking for paymentdetail sequences specifically...');
    const paymentSeqQuery = `
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      AND sequence_name LIKE '%paymentdetail%'
    `;

    const paymentSeqResult = await pool.query(paymentSeqQuery);
    if (paymentSeqResult.rows.length > 0) {
      console.log('[PAYMENT SEQUENCES FOUND]:');
      paymentSeqResult.rows.forEach(seq => {
        console.log(`  - ${seq.sequence_name}`);
      });
    } else {
      console.log('[NO PAYMENTDETAIL SEQUENCES FOUND]');
    }

    // Check for any id-related sequences
    console.log('\n[QUERY] Looking for ID-related sequences...');
    const idSeqQuery = `
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      AND sequence_name LIKE '%id%'
      ORDER BY sequence_name
    `;

    const idSeqResult = await pool.query(idSeqQuery);
    if (idSeqResult.rows.length > 0) {
      console.log('[ID SEQUENCES FOUND]:');
      idSeqResult.rows.forEach(seq => {
        console.log(`  - ${seq.sequence_name}`);
      });
    }

    // Check primary key info
    console.log('\n[QUERY] Checking primary key constraints...');
    const pkQuery = `
      SELECT constraint_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'paymentdetail'
      AND constraint_name LIKE '%pkey%'
    `;

    const pkResult = await pool.query(pkQuery);
    console.log('[PRIMARY KEY]:');
    if (pkResult.rows.length > 0) {
      pkResult.rows.forEach(pk => {
        console.log(`  - Constraint: ${pk.constraint_name}, Column: ${pk.column_name}`);
      });
    } else {
      console.log('  [NO PRIMARY KEY FOUND]');
    }

    console.log('\n=== END OF STRUCTURE CHECK ===\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkPaymentDetailStructure();
