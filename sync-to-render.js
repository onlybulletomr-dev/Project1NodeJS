#!/usr/bin/env node

/**
 * Sync Missing Employees to Render
 * 
 * This script calls the Render deployment to sync missing employees
 * Usage: node sync-to-render.js <render-url>
 * 
 * Example: node sync-to-render.js https://your-app.onrender.com
 */

const https = require('https');
const http = require('http');

const renderUrl = process.argv[2];

if (!renderUrl) {
  console.error('❌ Please provide Render URL');
  console.error('Usage: node sync-to-render.js https://your-app.onrender.com');
  process.exit(1);
}

console.log(`\n📡 Syncing employees to: ${renderUrl}`);
console.log('═'.repeat(60));

const urlObj = new URL(`${renderUrl}/admin/migrate/sync-missing-employees`);
const protocol = urlObj.protocol === 'https:' ? https : http;

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0
  }
};

const req = protocol.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('\n✅ Sync completed successfully!\n');
        console.log('Summary:');
        console.log(`  Total Processed: ${result.summary.total_processed}`);
        console.log(`  Added: ${result.summary.added}`);
        console.log(`  Skipped (already exist): ${result.summary.skipped}`);
        console.log(`  Errors: ${result.summary.errors}`);
        console.log(`  Total Active Employees: ${result.summary.total_active_employees}`);
        
        if (result.added && result.added.length > 0) {
          console.log('\n📝 Added employees:');
          result.added.forEach(emp => {
            console.log(`  ✓ ${emp.id}: ${emp.name}`);
          });
        }
        
        if (result.skipped && result.skipped.length > 0) {
          console.log('\n⊘ Already existing (skipped):');
          result.skipped.forEach(emp => {
            console.log(`  - ${emp.id}: ${emp.name}`);
          });
        }
        
        if (result.errors && result.errors.length > 0) {
          console.log('\n⚠️  Errors:');
          result.errors.forEach(err => {
            console.log(`  ✗ ${err.id} (${err.name}): ${err.error}`);
          });
        }
        
      } else {
        console.log('\n❌ Sync failed');
        console.log('Error:', result.error);
      }
      
      console.log('\n' + '═'.repeat(60));
      process.exit(result.success ? 0 : 1);
      
    } catch (err) {
      console.error('\n❌ Error parsing response:', err.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('\n❌ Request failed:', err.message);
  console.log('Make sure the Render URL is correct and the app is running');
  process.exit(1);
});

console.log('Sending sync request...\n');
req.end();
