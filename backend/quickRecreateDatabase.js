const { execSync } = require('child_process');
require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║      DATABASE RECREATION USING pg_dump (RELIABLE METHOD)     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

try {
  console.log('STEP 1: Exporting schema from local database...');
  
  // Export schema (without data)
  const localConnStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  
  execSync(
    `pg_dump --schema-only -f schema.sql "${localConnStr}"`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ Schema exported to schema.sql\n');

  console.log('STEP 2: Importing schema to Render database...');
  
  const renderConnStr = `postgresql://${process.env.RENDER_DB_USER}:${process.env.RENDER_DB_PASSWORD}@${process.env.RENDER_DB_HOST}:${process.env.RENDER_DB_PORT}/${process.env.RENDER_DB_NAME}?sslmode=require`;
  
  execSync(
    `psql "${renderConnStr}" < schema.sql`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ Schema imported to Render\n');

  console.log('STEP 3: Exporting all data from local database...');
  
  execSync(
    `pg_dump --data-only -f data.sql "${localConnStr}"`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ Data exported to data.sql\n');

  console.log('STEP 4: Importing all data to Render database...');
  
  execSync(
    `psql "${renderConnStr}" < data.sql`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ Data imported to Render\n');

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ✅ DATABASE RECREATION COMPLETE!                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('Render database now has the exact same schema and data as local!\n');

} catch (err) {
  console.error('❌ Error during migration:', err.message);
  process.exit(1);
}
