const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');
const pool = require('./config/db');

/**
 * Import vendor invoice items into itemdetail table
 * Usage: node importVendorInvoice.js <pdfFilePath> <branchId> [taxId]
 * Example: node importVendorInvoice.js invoice.pdf 3
 */

async function importVendorInvoice(pdfPath, branchId, taxId = null) {
  try {
    console.log(`\n📄 Reading PDF: ${pdfPath}`);
    console.log(`📦 Branch ID: ${branchId}`);
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`File not found: ${pdfPath}`);
    }

    // Read PDF file
    const fileBuffer = fs.readFileSync(pdfPath);
    const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    
    console.log(`\n✅ PDF read successfully (${pdfDoc.numPages} pages)`);
    
    // Extract text from all pages
    let text = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }

    console.log(`\n📋 Extracted Text:\n${'='.repeat(80)}`);
    console.log(text);
    console.log('='.repeat(80));
    
    // If taxId not provided, get default from database
    if (!taxId) {
      const taxResult = await pool.query(
        `SELECT taxid FROM taxmaster WHERE deletedat IS NULL ORDER BY taxid LIMIT 1`
      );
      if (taxResult.rows.length === 0) {
        throw new Error('No tax record found in database');
      }
      taxId = taxResult.rows[0].taxid;
      console.log(`\n🏷️  Using default Tax ID: ${taxId}`);
    }

    // Parse invoice items from text
    console.log('\n\n🔍 NEXT STEPS:');
    console.log('Please review the extracted text above and identify:');
    console.log('  1. Item part numbers');
    console.log('  2. Item descriptions');
    console.log('  3. Quantities');
    console.log('  4. Unit prices (optional)');
    console.log('\nThen create a JSON file with the format:');
    console.log(`
{
  "items": [
    {
      "partnumber": "PART001",
      "description": "Item Description",
      "quantity": 10,
      "unitprice": 100.00
    },
    {
      "partnumber": "PART002",
      "description": "Another Item",
      "quantity": 5,
      "unitprice": 50.00
    }
  ]
}
    `);
    console.log('Save this JSON file (e.g., vendor-items.json)');
    console.log('\nThen run the import command:');
    console.log('  node importVendorInvoice.js --import vendor-items.json 3 2');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

/**
 * Import items from JSON file into database
 */
async function importFromJSON(jsonPath, branchId, taxId) {
  try {
    console.log(`\n📄 Reading JSON: ${jsonPath}`);
    
    // Check if file exists
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    // Read and parse JSON
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const items = jsonData.items || [];

    if (items.length === 0) {
      throw new Error('No items found in JSON');
    }

    console.log(`\n📦 Found ${items.length} items to import`);
    console.log(`📍 Branch ID: ${branchId}`);
    console.log(`🏷️  Tax ID: ${taxId}`);

    // Import each item
    let successful = 0;
    let failed = 0;
    const results = [];

    for (const item of items) {
      try {
        const { partnumber, description, quantity, unitprice } = item;

        if (!partnumber) {
          throw new Error('partnumber is required');
        }

        // Check if item exists in itemmaster
        const itemCheck = await pool.query(
          `SELECT itemid FROM itemmaster WHERE LOWER(partnumber) = LOWER($1) AND deletedat IS NULL LIMIT 1`,
          [partnumber]
        );

        if (itemCheck.rows.length === 0) {
          results.push({
            status: 'skipped',
            partnumber,
            reason: 'Not found in itemmaster',
          });
          failed++;
          continue;
        }

        const itemId = itemCheck.rows[0].itemid;

        // Check if already exists in itemdetail for this branch
        const existing = await pool.query(
          `SELECT itemdetailid FROM itemdetail WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL`,
          [itemId, branchId]
        );

        if (existing.rows.length > 0) {
          // Update existing record
          const updateResult = await pool.query(
            `UPDATE itemdetail 
             SET quantityonhand = COALESCE(quantityonhand, 0) + $1,
                 updatedby = 1,
                 updatedat = NOW()
             WHERE itemid = $2 AND branchid = $3 AND deletedat IS NULL
             RETURNING *`,
            [quantity, itemId, branchId]
          );

          results.push({
            status: 'updated',
            partnumber,
            description,
            quantity,
            newTotal: updateResult.rows[0].quantityonhand,
          });
          successful++;
        } else {
          // Create new record
          const createResult = await pool.query(
            `INSERT INTO itemdetail 
             (itemid, branchid, quantityonhand, taxid, minstocklevel, reorderquantity, createdby, createdat)
             VALUES ($1, $2, $3, $4, 2, 1, 1, NOW())
             RETURNING *`,
            [itemId, branchId, quantity, taxId]
          );

          results.push({
            status: 'created',
            partnumber,
            description,
            quantity,
            message: 'New item added to inventory',
          });
          successful++;
        }
      } catch (itemError) {
        results.push({
          status: 'error',
          partnumber: item.partnumber,
          error: itemError.message,
        });
        failed++;
      }
    }

    // Print results
    console.log('\n\n✅ IMPORT RESULTS:');
    console.log('='.repeat(80));
    results.forEach(result => {
      if (result.status === 'created') {
        console.log(`✓ CREATED: ${result.partnumber} - ${result.description || ''} (Qty: ${result.quantity})`);
      } else if (result.status === 'updated') {
        console.log(`↻ UPDATED: ${result.partnumber} - ${result.description || ''} (Added: ${result.quantity}, Total: ${result.newTotal})`);
      } else if (result.status === 'skipped') {
        console.log(`⊘ SKIPPED: ${result.partnumber} - ${result.reason}`);
      } else if (result.status === 'error') {
        console.log(`✗ ERROR: ${result.partnumber} - ${result.error}`);
      }
    });
    
    console.log('='.repeat(80));
    console.log(`\n📊 Summary: ${successful} successful, ${failed} failed out of ${items.length} items`);

    if (successful > 0) {
      console.log('✅ Import completed successfully!');
    }

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args[0] === '--import' && args[1]) {
  const jsonFile = args[1];
  const branchId = parseInt(args[2] || 1);
  const taxId = args[3] || null;
  importFromJSON(jsonFile, branchId, taxId);
} else if (args[0] && !args[0].startsWith('--')) {
  const pdfFile = args[0];
  const branchId = parseInt(args[1] || 1);
  importVendorInvoice(pdfFile, branchId).then(() => {
    pool.end();
  });
} else {
  console.log(`
Usage:
  1. Extract text from PDF:
     node importVendorInvoice.js <pdfFilePath> [branchId=1]
  
  2. Import items from JSON:
     node importVendorInvoice.js --import <jsonFile> [branchId=1] [taxId=2]

Example:
  node importVendorInvoice.js invoice.pdf 3
  node importVendorInvoice.js --import items.json 3
  `);
  process.exit(0);
}
