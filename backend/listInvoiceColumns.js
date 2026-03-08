const pool = require('./config/db');

(async ()=> {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoicemaster' AND table_schema = 'public' ORDER BY ordinal_position");
  console.log('InvoiceMaster columns:');
  res.rows.forEach((r, i) => console.log(`${i+1}. ${r.column_name}`));
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
