const pool = require('./backend/config/db');

pool.query(`
  SELECT column_name, column_default, is_identity, data_type, is_nullable
  FROM information_schema.columns 
  WHERE table_name = 'invoicedetail' 
  ORDER BY ordinal_position
`)
  .then(r => {
    console.log('InvoiceDetail Table Schema:');
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
