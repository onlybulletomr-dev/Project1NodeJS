#!/usr/bin/env node

/**
 * Migration Runner - Execute database migrations
 * Usage: node migrate.js [--migration=name] [--list]
 */

const path = require('path');
const fs = require('fs');

const migrationsDir = path.join(__dirname, 'migrations');

// Parse command line arguments
const args = process.argv.slice(2);
const specificMigration = args.find(arg => arg.startsWith('--migration='))?.split('=')[1];
const listMigrations = args.includes('--list');

async function runMigration(filename) {
  try {
    console.log(`\n🚀 Running migration: ${filename}`);
    console.log('=' .repeat(60));
    
    const migrationPath = path.join(migrationsDir, filename);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${filename}`);
      return false;
    }

    // Clear require cache to ensure fresh execution
    delete require.cache[require.resolve(migrationPath)];
    
    // Import and run the migration
    const migration = require(migrationPath);
    
    if (migration.alterLogoimagepathColumn) {
      await migration.alterLogoimagepathColumn();
    } else if (typeof migration === 'function') {
      await migration();
    } else {
      console.error(`❌ Migration doesn't export a function: ${filename}`);
      return false;
    }

    console.log('=' .repeat(60) + '\n');
    return true;
  } catch (error) {
    console.error(`\n❌ Migration failed: ${filename}`);
    console.error('Error:', error.message);
    console.error('=' .repeat(60) + '\n');
    return false;
  }
}

async function listAvailableMigrations() {
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js') && f !== 'runMigration.js')
      .sort();
    
    console.log('\n📋 Available migrations:');
    console.log('=' .repeat(60));
    files.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });
    console.log('=' .repeat(60) + '\n');
    return files;
  } catch (error) {
    console.error('Error listing migrations:', error.message);
    return [];
  }
}

async function main() {
  if (listMigrations) {
    await listAvailableMigrations();
    return;
  }

  if (specificMigration) {
    const success = await runMigration(specificMigration);
    process.exit(success ? 0 : 1);
  } else {
    // Run key migrations in order
    const keyMigrations = [
      'alter-logoimagepath-to-text.js'
    ];

    console.log('\n🔄 Running database migrations...\n');
    
    let failed = false;
    for (const migration of keyMigrations) {
      const success = await runMigration(migration);
      if (!success) {
        failed = true;
        // Continue with other migrations
      }
    }

    if (failed) {
      console.error('\n⚠️  Some migrations failed. Check logs above.');
      process.exit(1);
    } else {
      console.log('\n✅ All migrations completed successfully!');
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
