const pool = require('./backend/config/db');
const fs = require('fs');
const path = require('path');

/**
 * Store logo image as Base64 in database
 * Usage: node storeLogoInDatabase.js <imagePath> <companyId>
 * Example: node storeLogoInDatabase.js ./logo.png 1
 */

async function storeLogoInDatabase() {
  try {
    // Get arguments from command line
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('Usage: node storeLogoInDatabase.js <imagePath> <companyId>');
      console.log('');
      console.log('Example:');
      console.log('  node storeLogoInDatabase.js ./logo.png 1');
      console.log('  node storeLogoInDatabase.js c:\\logos\\only-bullet.png 1');
      console.log('');
      console.log('Supported formats: PNG, JPG, SVG');
      console.log('Recommended size: 500x500px (square format)');
      process.exit(1);
    }

    const imagePath = args[0];
    const companyId = parseInt(args[1], 10);

    // Validate company ID
    if (isNaN(companyId)) {
      console.error('❌ Invalid company ID. Must be a number.');
      process.exit(1);
    }

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ File not found: ${imagePath}`);
      process.exit(1);
    }

    // Read the image file
    console.log(`📖 Reading image file: ${imagePath}`);
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Determine the mime type based on file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/png'; // default
    
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.svg') {
      mimeType = 'image/svg+xml';
    }

    // Convert to Base64
    const base64String = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    console.log(`✅ Image converted to Base64`);
    console.log(`   Format: ${mimeType}`);
    console.log(`   Size: ${imageBuffer.length} bytes`);
    console.log(`   Base64 length: ${base64String.length} characters`);

    // Check if company exists
    const checkCompany = await pool.query(
      'SELECT companyid, companyname FROM companymaster WHERE companyid = $1 AND deletedat IS NULL',
      [companyId]
    );

    if (checkCompany.rows.length === 0) {
      console.error(`❌ Company with ID ${companyId} not found.`);
      process.exit(1);
    }

    const company = checkCompany.rows[0];
    console.log(`\n📋 Company found: ${company.companyname} (ID: ${company.companyid})`);

    // Update the database
    console.log('\n💾 Updating database...');
    const result = await pool.query(
      `UPDATE companymaster 
       SET logoimagepath = $1
       WHERE companyid = $2`,
      [dataUrl, companyId]
    );

    console.log(`✅ Logo stored successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Company: ${company.companyname}`);
    console.log(`   Image format: ${mimeType}`);
    console.log(`   Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Stored at: logoimagepath field`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

storeLogoInDatabase();
