const pool = require('./config/db');

async function createMissingSequence() {
  try {
    console.log('=== CHECKING AND CREATING MISSING SEQUENCES ===\n');

    // Check if sequence exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.sequences 
        WHERE sequence_schema = 'public' 
        AND sequence_name = 'paymentdetail_paymentreceivedid_seq'
      ) as sequence_exists
    `;

    const result = await pool.query(checkQuery);
    const sequenceExists = result.rows[0].sequence_exists;

    console.log(`[CHECK] paymentdetail_paymentreceivedid_seq exists: ${sequenceExists}`);

    if (!sequenceExists) {
      console.log('\n[ACTION] Creating missing sequence...');
      
      // Create the sequence
      const createSeqQuery = `
        CREATE SEQUENCE paymentdetail_paymentreceivedid_seq
        INCREMENT BY 1
        START WITH 1
        NO MAXVALUE
        CACHE 1
      `;

      await pool.query(createSeqQuery);
      console.log('✅ [SUCCESS] Sequence created: paymentdetail_paymentreceivedid_seq');

      // Now check the max value in paymentdetail to set the sequence properly
      const maxQuery = `
        SELECT MAX(paymentreceivedid) as max_id FROM paymentdetail
      `;

      const maxResult = await pool.query(maxQuery);
      const maxId = maxResult.rows[0].max_id;

      console.log(`[INFO] Current max paymentreceivedid in table: ${maxId}`);

      if (maxId) {
        // Set sequence to next value after max
        const setSeqQuery = `
          SELECT setval('paymentdetail_paymentreceivedid_seq', ${maxId + 1})
        `;
        
        await pool.query(setSeqQuery);
        console.log(`✅ [SUCCESS] Sequence reset to start from: ${maxId + 1}`);
      }

      // Verify the column default
      console.log('\n[ACTION] Verifying column default...');
      const colQuery = `
        SELECT column_default FROM information_schema.columns
        WHERE table_name = 'paymentdetail' AND column_name = 'paymentreceivedid'
      `;

      const colResult = await pool.query(colQuery);
      console.log(`[INFO] Current column_default: ${colResult.rows[0].column_default}`);

      if (!colResult.rows[0].column_default || !colResult.rows[0].column_default.includes('paymentdetail_paymentreceivedid_seq')) {
        console.log('[ACTION] Setting column default to use sequence...');
        
        const setDefaultQuery = `
          ALTER TABLE paymentdetail
          ALTER COLUMN paymentreceivedid SET DEFAULT nextval('paymentdetail_paymentreceivedid_seq'::regclass)
        `;

        await pool.query(setDefaultQuery);
        console.log('✅ [SUCCESS] Column default set');
      }

    } else {
      console.log('✅ [INFO] Sequence already exists');
      
      // Verify column default
      const colQuery = `
        SELECT column_default FROM information_schema.columns
        WHERE table_name = 'paymentdetail' AND column_name = 'paymentreceivedid'
      `;

      const colResult = await pool.query(colQuery);
      console.log(`[INFO] Column default: ${colResult.rows[0].column_default}`);
    }

    console.log('\n=== VERIFICATION ===\n');

    // Final verification
    const finalCheckQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.sequences 
        WHERE sequence_schema = 'public' 
        AND sequence_name = 'paymentdetail_paymentreceivedid_seq'
      ) as sequence_exists
    `;

    const finalResult = await pool.query(finalCheckQuery);
    console.log(`✅ Sequence exists: ${finalResult.rows[0].sequence_exists}`);

    console.log('\n=== COMPLETE ===\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Code:', error.code);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

createMissingSequence();
