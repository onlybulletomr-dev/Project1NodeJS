const {Pool} = require('pg');
const pool = new Pool({
  host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
  port: 5432,
  database: 'project1db_nrlz',
  user: 'postgres1',
  password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
  ssl: {rejectUnauthorized: false}
});

pool.query(`
SELECT 
  (SELECT COUNT(*) FROM itemmaster) AS total_items,
  (SELECT COUNT(*) FROM itemmaster WHERE deletedat IS NULL) AS active_items,
  (SELECT COUNT(DISTINCT column_name) FROM information_schema.columns WHERE table_name='itemmaster') AS columns
`).then(r => {
  const data = r.rows[0];
  console.log('RENDER ITEMMASTER STATUS:');
  console.log('  Total items: ' + data.total_items);
  console.log('  Active items: ' + data.active_items);
  console.log('  Columns: ' + data.columns);
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
  process.exit(1);
});
