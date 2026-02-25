const db = require('./config/db');

console.log('Checking vehiclemaster colors:\n');

db.query(
  'SELECT DISTINCT modelname, color FROM vehiclemaster WHERE deletedat IS NULL ORDER BY modelname',
  (err, res) => {
    if (err) {
      console.error('Error:', err);
      db.end();
      return;
    }
    
    console.log(`Found ${res.rows.length} model/color combinations:\n`);
    
    const groupedByModel = {};
    res.rows.forEach(row => {
      if (!groupedByModel[row.modelname]) {
        groupedByModel[row.modelname] = [];
      }
      groupedByModel[row.modelname].push(row.color);
    });
    
    Object.entries(groupedByModel).forEach(([model, colors]) => {
      console.log(`${model}:`);
      colors.forEach(c => console.log(`  - ${c}`));
    });
    
    db.end();
  }
);
