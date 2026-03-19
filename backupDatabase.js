#!/usr/bin/env node

/**
 * Database Backup to SQL - Using Node.js & pg_dump via Process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const BACKUP_DIR = 'backups/backup-2026-03-12-1773330593535';
const DB_BACKUP_FILE = path.join(BACKUP_DIR, 'database-backup.sql');

async function backupDatabase() {
  try {
    console.log('=== DATABASE BACKUP USING PG_DUMP ===\n');
    
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const dbUser = process.env.DB_USER;
    const dbName = process.env.DB_NAME;
    const dbPassword = process.env.DB_PASSWORD;
    
    // Try to find pg_dump in common PostgreSQL installation paths
    const pgDumpPaths = [
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
      'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\pg_dump.exe',
    ];
    
    let pgDumpPath = null;
    for (const path of pgDumpPaths) {
      if (fs.existsSync(path)) {
        pgDumpPath = path;
        console.log(`Found pg_dump at: ${path}\n`);
        break;
      }
    }
    
    if (!pgDumpPath) {
      console.log('pg_dump not found. Creating backup using Node.js pool query...\n');
      await backupUsingNodePool();
      return;
    }
    
    // Run pg_dump
    const command = `"${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -v`;
    console.log(`Running: ${command}\n`);
    
    const output = execSync(command, {
      env: { ...process.env, PGPASSWORD: dbPassword },
      encoding: 'utf-8'
    });
    
    fs.writeFileSync(DB_BACKUP_FILE, output);
    const fileSizeMB = (output.length / 1024 / 1024).toFixed(2);
    console.log(`✓ Database backed up successfully`);
    console.log(`  File: ${DB_BACKUP_FILE}`);
    console.log(`  Size: ${fileSizeMB} MB\n`);
    
  } catch (error) {
    console.error('Error during pg_dump:', error.message);
    console.log('\nFalling back to Node.js pool backup...\n');
    await backupUsingNodePool();
  }
}

async function backupUsingNodePool() {
  const pool = require('./backend/config/db');
  
  try {
    console.log('Creating backup using Node.js database pool...\n');
    
    // Get all table names
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    let sqlContent = `-- Database Backup - Project1db
-- Generated: ${new Date().toISOString()}
-- PostgreSQL Database Dump

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables\n`);
    
    // Get data for each table
    for (const table of tables) {
      try {
        const dataResult = await pool.query(`SELECT * FROM "${table}"`);
        
        if (dataResult.rows.length > 0) {
          const columns = Object.keys(dataResult.rows[0]);
          sqlContent += `\n-- Table: ${table}\n`;
          sqlContent += `TRUNCATE TABLE "${table}" CASCADE;\n`;
          
          // Insert statements
          dataResult.rows.forEach(row => {
            const values = columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              return val;
            }).join(', ');
            
            sqlContent += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values});\n`;
          });
          
          console.log(`  ✓ ${table}: ${dataResult.rows.length} records`);
        }
      } catch (err) {
        console.warn(`  ⚠ ${table}: Could not backup (${err.message})`);
      }
    }
    
    fs.writeFileSync(DB_BACKUP_FILE, sqlContent);
    const fileSizeMB = (sqlContent.length / 1024 / 1024).toFixed(2);
    console.log(`\n✓ Backup file created: ${DB_BACKUP_FILE}`);
    console.log(`  Size: ${fileSizeMB} MB\n`);
    
    await pool.end();
    
  } catch (error) {
    console.error('Error backing up database:', error.message);
  }
}

backupDatabase();
