const { Pool } = require('pg');
require('dotenv').config();

console.time('Total Time');

const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST,
  port: 5432,
  user: process.env.RENDER_DB_USER,
  password: process.env.RENDER_DB_PASSWORD,
  database: process.env.RENDER_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('Connecting to Render...');
    console.time('Connect');
    await renderPool.query('SELECT 1');
    console.timeEnd('Connect');

    console.log('\nChecking current tables...');
    console.time('List Tables');
    const tables = await renderPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.timeEnd('List Tables');
    console.log(`Found: ${tables.rows.length} tables\n`);

    // Test insert speed
    console.log('Testing insert speed...');
    
    try {
      await renderPool.query('DROP TABLE IF EXISTS test_speed_table');
      await renderPool.query('CREATE TABLE test_speed_table (id SERIAL, name VARCHAR(100))');
      
      console.time('1000 Inserts');
      for (let i = 1; i <= 1000; i++) {
        await renderPool.query('INSERT INTO test_speed_table (name) VALUES ($1)', [`test_${i}`]);
      }
      console.timeEnd('1000 Inserts');
      
      await renderPool.query('DROP TABLE test_speed_table');
    } catch (err) {
      console.error('Insert test error:', err.message);
    }

    await renderPool.end();
    console.timeEnd('Total Time');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

test();
