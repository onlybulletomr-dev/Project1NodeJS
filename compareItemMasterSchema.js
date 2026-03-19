#!/usr/bin/env node

/**
 * Compare itemmaster table schema between local and Render
 * Identify new columns that need to be added to Render
 */

const localDb = require('./backend/config/db');

async function compareItemMasterSchema() {
  console.log('=== COMPARING ITEMMASTER SCHEMA ===\n');

  try {
    // Get columns from local database
    const localSchemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'itemmaster' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const localResult = await localDb.query(localSchemaQuery);
    
    console.log('📋 LOCAL ITEMMASTER TABLE COLUMNS:');
    console.log('─'.repeat(100));
    localResult.rows.forEach((col, idx) => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      const hasDefault = col.column_default ? `(Default: ${col.column_default})` : '';
      console.log(`${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | Null: ${nullable} ${hasDefault}`);
    });

    console.log('\n📊 LOCAL TOTAL COLUMNS:', localResult.rows.length);
    console.log('\nLocal column names:');
    console.log(localResult.rows.map(r => r.column_name).join(', '));

    // Get row count
    const countResult = await localDb.query('SELECT COUNT(*) as total FROM itemmaster WHERE deletedat IS NULL');
    console.log('\n📈 LOCAL RECORD COUNT (active):', countResult.rows[0].total);

    // Get sample records
    console.log('\n📄 SAMPLE LOCAL RECORDS:');
    const sampleResult = await localDb.query('SELECT * FROM itemmaster WHERE deletedat IS NULL LIMIT 3');
    sampleResult.rows.forEach((row, idx) => {
      console.log(`\nRecord ${idx + 1}:`);
      console.log(JSON.stringify(row, null, 2).split('\n').slice(0, 10).join('\n'));
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  }

  await localDb.end();
  process.exit(0);
}

compareItemMasterSchema();
