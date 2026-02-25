
const { Pool } = require('pg');

// Render database connection
const renderPool = new Pool({
  host: process.env.RENDER_DB_HOST || 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
  port: 5432,
  user: process.env.RENDER_DB_USER || 'project1db_user',
  password: process.env.RENDER_DB_PASSWORD || 'h9v2cPmT7nL4wX8dQ1bJ',
  database: process.env.RENDER_DB_NAME || 'project1db',
  ssl: { rejectUnauthorized: false }
});

// Local database connection
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'project1db'
});

async function checkStatus() {
  try {
    console.log('🔍 CHECKING DATABASE STATUS...\n');

    // Get all tables from Render
    const renderResult = await renderPool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    
    // Get all tables from Local
    const localResult = await localPool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' ORDER BY table_name`
    );

    const renderTables = renderResult.rows.map(r => r.table_name).sort();
    const localTables = localResult.rows.map(r => r.table_name).sort();

    console.log('📊 RENDER DATABASE:', renderTables.length, 'tables');
    renderTables.forEach(t => console.log('  ✓', t));

    console.log('\n📊 LOCAL DATABASE:', localTables.length, 'tables');
    localTables.forEach(t => console.log('  ✓', t));

    console.log('\n🔴 MISSING IN RENDER:');
    const missing = localTables.filter(t => !renderTables.includes(t));
    if (missing.length === 0) {
      console.log('  ✅ NONE - All tables present!');
    } else {
      missing.forEach(t => console.log('  ✗', t));
    }

    console.log('\nSync Progress:', renderTables.length, '/', localTables.length, '(' + Math.round(renderTables.length / localTables.length * 100) + '%)');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

checkStatus();
