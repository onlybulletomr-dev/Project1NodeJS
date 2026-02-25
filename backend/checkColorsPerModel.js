const db = require('./config/db');

console.log('Checking colors for each vehicle model:\n');

// Get all unique models
db.query('SELECT DISTINCT vehiclemodel FROM vehicledetail WHERE deletedat IS NULL ORDER BY vehiclemodel', 
  (err, modelsRes) => {
    if (err) {
      console.error('Error:', err);
      db.end();
      return;
    }
    
    const models = modelsRes.rows.map(r => r.vehiclemodel);
    console.log(`Found ${models.length} models total\n`);
    
    let completed = 0;
    models.forEach(model => {
      db.query(
        'SELECT DISTINCT vehiclecolor FROM vehicledetail WHERE vehiclemodel = $1 AND deletedat IS NULL ORDER BY vehiclecolor',
        [model],
        (err2, colorsRes) => {
          if (err2) {
            console.log(`❌ ${model}: Error - ${err2.message}`);
          } else {
            const colors = colorsRes.rows.map(r => r.vehiclecolor);
            console.log(`${colors.length > 0 ? '✓' : '❌'} ${model}: ${colors.length} colors`);
            if (colors.length > 0) {
              colors.forEach(c => console.log(`     - ${c}`));
            }
          }
          
          completed++;
          if (completed === models.length) {
            db.end();
          }
        }
      );
    });
  }
);
