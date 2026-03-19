const pool = require('./backend/config/db');

pool.query('SELECT companyid, companyname FROM companymaster ORDER BY companyid;', (err, res) => { 
  if (err) {
    console.error('ERROR:', err);
  } else { 
    console.log('All Branches:');
    res.rows.forEach(r => console.log(`ID ${r.companyid}: ${r.companyname}`));
  }
  pool.end();
});
