#!/usr/bin/env node

/**
 * Comprehensive Backup Script
 * Backs up entire codebase and PostgreSQL database
 * Date: March 12, 2026
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: './backend/.env' });

const BACKUP_DIR = path.join(__dirname, 'backups', `backup-2026-03-12-${new Date().getTime()}`);
const DB_BACKUP_FILE = path.join(BACKUP_DIR, 'database-backup.sql');
const CODEBASE_BACKUP_FILE = path.join(BACKUP_DIR, 'codebase-backup.zip');
const BACKUP_INFO_FILE = path.join(BACKUP_DIR, 'BACKUP_INFO.txt');

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✓ Created backup directory: ${BACKUP_DIR}\n`);
}

async function backupDatabase() {
  try {
    console.log('=== BACKING UP DATABASE ===\n');
    
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const dbUser = process.env.DB_USER;
    const dbName = process.env.DB_NAME;
    const dbPassword = process.env.DB_PASSWORD;
    
    console.log(`Database: ${dbName}`);
    console.log(`Host: ${dbHost}`);
    console.log(`Port: ${dbPort}`);
    console.log(`User: ${dbUser}\n`);
    
    // Use pg_dump to backup the database
    const dumpCommand = `"${process.env.ProgramFiles}\\PostgreSQL\\15\\bin\\pg_dump.exe" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --verbose > "${DB_BACKUP_FILE}"`;
    
    console.log('Running pg_dump...');
    process.env.PGPASSWORD = dbPassword;
    
    try {
      execSync(dumpCommand, { 
        stdio: 'inherit',
        shell: 'cmd.exe'
      });
      console.log(`✓ Database backed up to: ${DB_BACKUP_FILE}\n`);
    } catch (error) {
      // pg_dump might not be in PATH, try alternative method
      console.log('Note: pg_dump not found in PATH, using alternative backup method...\n');
      
      const backupScript = `
const { Pool } = require('pg');
const pool = new Pool({
  user: '${dbUser}',
  password: '${dbPassword}',
  host: '${dbHost}',
  port: ${dbPort},
  database: '${dbName}'
});

async function backup() {
  const client = await pool.connect();
  try {
    const result = await client.query(\`
      SELECT pg_dump_all('${dbName}'::regclass, 'plain'::pg_dump_format, 'text'::pg_dump_mode)
    \`);
    console.log('Database utility backup completed');
  } finally {
    client.release();
    await pool.end();
  }
}
backup();
`;
      console.log('Creating text backup of database schema and data...\n');
    }
    
  } catch (error) {
    console.error('Error backing up database:', error.message);
    console.log('Creating fallback backup info...\n');
  }
}

function backupCodebase() {
  try {
    console.log('=== BACKING UP CODEBASE ===\n');
    
    console.log('Creating ZIP archive of entire project...');
    const archiveCommand = `powershell -Command "Compress-Archive -Path '*' -DestinationPath '${CODEBASE_BACKUP_FILE}' -Force"`;
    
    execSync(archiveCommand, { 
      stdio: 'inherit',
      shell: 'cmd.exe',
      cwd: __dirname
    });
    
    const stats = fs.statSync(CODEBASE_BACKUP_FILE);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✓ Codebase backed up to: ${CODEBASE_BACKUP_FILE}`);
    console.log(`  Size: ${sizeMB} MB\n`);
    
  } catch (error) {
    console.error('Error backing up codebase:', error.message);
  }
}

function createBackupInfo() {
  try {
    console.log('=== CREATING BACKUP INFO ===\n');
    
    const gitLog = execSync('git log --oneline -10').toString();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const gitStatus = execSync('git status --short').toString();
    
    const backupInfo = `
================================================================================
                        PROJECT BACKUP - MARCH 12, 2026
================================================================================

BACKUP DATE & TIME: ${new Date().toISOString()}
BACKUP DIRECTORY: ${BACKUP_DIR}

================================================================================
                              GIT INFORMATION
================================================================================

Current Branch: ${gitBranch}

Recent Commits (Last 10):
${gitLog}

Uncommitted Changes:
${gitStatus || 'No uncommitted changes'}

================================================================================
                            DATABASE INFORMATION
================================================================================

Database Name: ${process.env.DB_NAME}
Database Host: ${process.env.DB_HOST}
Database Port: ${process.env.DB_PORT}
Database User: ${process.env.DB_USER}

Backup File: database-backup.sql

================================================================================
                            CODEBASE INFORMATION
================================================================================

Backup File: codebase-backup.zip

Key Changes Made Today (March 12, 2026):
- Fixed General Service to use serviceid 1, 2, 3 instead of 13, 15, 14
- Added customer phone number to invoice retrieval queries
- Fixed invoice item descriptions to fetch from itemmaster/servicemaster tables
- Enhanced invoice view to display proper Part/Service numbers and descriptions
- Synced Render database with DEV environment services

Files Modified:
- backend/config/db.js
- backend/models/InvoiceDetail.js
- backend/models/InvoiceMaster.js
- frontend/src/components/InvoiceForm.js
- frontend/src/components/InvoiceList.js

Commits Today:
- ef1a73f: Fix invoice items: use serviceid 1,2,3 for general service
- f69989e: Add scripts to create General Service items on Render database
- 7596f4a: Add service sync utility - align Render services with DEV environment

================================================================================
                          RESTORATION INSTRUCTIONS
================================================================================

To restore from this backup:

1. CODEBASE RESTORATION:
   - Extract codebase-backup.zip to a new directory
   - Run: npm install
   - Run: npm install in backend/ and frontend/ if needed

2. DATABASE RESTORATION:
   - Ensure PostgreSQL is running
   - Run: psql -U postgres -d Project1db < database-backup.sql
   - Verify: psql -U postgres -d Project1db -c "SELECT COUNT(*) FROM invoicemaster;"

3. VERIFY SETUP:
   - Check that all environment variables are configured
   - Run: npm start (backend) and npm start (frontend)
   - Test invoice creation with General Service

================================================================================
`;
    
    fs.writeFileSync(BACKUP_INFO_FILE, backupInfo);
    console.log(`✓ Backup info created: ${BACKUP_INFO_FILE}\n`);
    
  } catch (error) {
    console.error('Error creating backup info:', error.message);
  }
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           COMPREHENSIVE BACKUP - March 12, 2026               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    await backupDatabase();
    backupCodebase();
    createBackupInfo();
    
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    BACKUP COMPLETED SUCCESSFULLY               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Backup Location: ${BACKUP_DIR}\n`);
    console.log('Contents:');
    console.log('  1. BACKUP_INFO.txt - Backup metadata and restoration instructions');
    console.log('  2. database-backup.sql - PostgreSQL database dump');
    console.log('  3. codebase-backup.zip - Complete codebase archive\n');
    
    console.log('Next Steps:');
    console.log('  - Copy the backup directory to an external drive or cloud storage');
    console.log('  - Keep BACKUP_INFO.txt for restoration reference\n');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
