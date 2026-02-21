const pool = require('./config/db');

const tables = ['vehiclemaster', 'vehicledetails', 'invoicemaster', 'customermaster'];

async function checkColumns() {
  for (const table of tables) {
    try {
      const res = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
      );
      console.log(`\nColumns in ${table}:`);
      res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    } catch (err) {
      console.log(`Error querying ${table}:`, err.message);
    }
  }
  process.exit(0);
}

checkColumns();
