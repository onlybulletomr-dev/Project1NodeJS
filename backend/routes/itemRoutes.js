const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const ItemMaster = require('../models/ItemMaster');
const ItemDetail = require('../models/ItemDetail');
const pool = require('../config/db');
const { extractTextFromPDF, parseInvoiceText } = require('../utils/pdfParser');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Search items by part number or item name
router.get('/items/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }
    const items = await ItemMaster.searchByPartNumber(q);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all items
router.get('/items', async (req, res) => {
  try {
    const items = await ItemMaster.getAll();
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ItemMaster.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get first TaxId from TaxMaster
router.get('/items/tax/first-taxid', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT taxid FROM taxmaster WHERE deletedat IS NULL ORDER BY taxid LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No tax record found' });
    }

    res.status(200).json({ success: true, data: { taxid: result.rows[0].taxid } });
  } catch (error) {
    console.error('Error fetching first tax id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update or create item detail - for Update Items popup
router.post('/items/detail/update-quantity', async (req, res) => {
  try {
    const { itemId, branchId, qtyToAdd } = req.body;
    const userId = req.headers['x-user-id'] || 1;

    if (!itemId || !branchId || qtyToAdd === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'itemId, branchId, and qtyToAdd are required' 
      });
    }

    // Check if item detail exists for this branch
    let itemDetail = await ItemDetail.getByItemIdAndBranchId(itemId, branchId);

    if (itemDetail) {
      // Update existing record
      itemDetail = await ItemDetail.updateQuantity(itemId, branchId, qtyToAdd, userId);
      return res.status(200).json({ 
        success: true, 
        message: 'Item detail updated successfully',
        data: itemDetail,
        action: 'updated'
      });
    } else {
      // Create new record - get first tax id
      const taxResult = await pool.query(
        `SELECT taxid FROM taxmaster WHERE deletedat IS NULL ORDER BY taxid LIMIT 1`
      );
      
      if (taxResult.rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No tax record found in database' 
        });
      }

      const taxId = taxResult.rows[0].taxid;
      const minStockLevel = 2;
      const reorderQuantity = 1;

      itemDetail = await ItemDetail.create(
        itemId, 
        branchId, 
        qtyToAdd, 
        taxId, 
        minStockLevel, 
        reorderQuantity, 
        userId
      );

      return res.status(201).json({ 
        success: true, 
        message: 'Item detail created successfully',
        data: itemDetail,
        action: 'created'
      });
    }
  } catch (error) {
    console.error('Error updating/creating item detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate vendor invoice PDF and extract items
router.post('/items/validate-vendor-invoice', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file provided' });
    }

    const branchId = req.headers['x-branch-id'] ? parseInt(req.headers['x-branch-id']) : 1;
    const userId = req.user?.id || req.headers['x-user-id'];
    
    // Extract text from PDF
    console.log(`📄 Extracting text from PDF: ${req.file.originalname}`);
    const pdfText = await extractTextFromPDF(req.file.buffer);
    
    // Parse invoice items AND bill number
    console.log('🔍 Parsing invoice items...');
    const parseResult = parseInvoiceText(pdfText);
    const invoiceItems = parseResult.items;
    const billNo = parseResult.billNo;
    
    if (!billNo) {
      console.warn('⚠️  Could not extract Bill No from invoice');
    }
    
    if (!invoiceItems || invoiceItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Could not extract inventory items from PDF' 
      });
    }

    // Check if bill was already processed (only if billNo exists)
    if (billNo) {
      const processedCheck = await pool.query(
        `SELECT id, createdat FROM processedfiles 
         WHERE billno = $1 AND deletedat IS NULL`,
        [billNo]
      );
      
      if (processedCheck.rows.length > 0) {
        console.log(`⚠️  Duplicate invoice detected: Bill No ${billNo}`);
        return res.status(409).json({ 
          success: false, 
          isDuplicate: true,
          billNo,
          message: `This invoice (Bill No: ${billNo}) was already processed on ${processedCheck.rows[0].createdat}`,
          requiresPassword: true
        });
      }
    }

    console.log(`✅ Found ${invoiceItems.length} items in invoice`);

    // Record the invoice as processed (if billNo is available)
    if (billNo) {
      await pool.query(
        `INSERT INTO processedfiles (billno, filename, branchid, createdby, createdat, updatedat) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (billno) DO NOTHING`,
        [billNo, req.file.originalname, branchId, userId]
      );
      console.log(`✓ Invoice recorded as processed with Bill No: ${billNo}`);
    }

    // Enrich items with existing quantities from database
    const enrichedItems = [];
    for (const invoiceItem of invoiceItems) {
      try {
        // Find item in itemmaster
        const itemMaster = await pool.query(
          `SELECT itemid, partnumber, itemname 
           FROM itemmaster 
           WHERE LOWER(partnumber) = LOWER($1) AND deletedat IS NULL 
           LIMIT 1`,
          [invoiceItem.partnumber]
        );

        if (itemMaster.rows.length === 0) {
          // Item not in master - skip it
          console.log(`⚠️  Part number ${invoiceItem.partnumber} not found in itemmaster`);
          continue;
        }

        const itemId = itemMaster.rows[0].itemid;
        const description = invoiceItem.description || itemMaster.rows[0].itemname || '';

        // Get existing quantity from itemdetail
        const existing = await pool.query(
          `SELECT quantityonhand FROM itemdetail 
           WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL`,
          [itemId, branchId]
        );

        const currentQty = existing.rows.length > 0 ? parseFloat(existing.rows[0].quantityonhand) : 0;

        enrichedItems.push({
          itemid: itemId,
          partnumber: invoiceItem.partnumber,
          description,
          currentQty,
          qtyReceived: invoiceItem.qtyReceived,
        });
      } catch (itemError) {
        console.error(`Error processing item ${invoiceItem.partnumber}:`, itemError.message);
      }
    }

    if (enrichedItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No items from invoice matched itemmaster records' 
      });
    }

    console.log(`✅ Enriched ${enrichedItems.length} items with database info`);

    res.status(200).json({ 
      success: true, 
      message: `Successfully parsed ${enrichedItems.length} items from invoice`,
      data: {
        filename: req.file.originalname,
        branchId,
        items: enrichedItems,
      }
    });

  } catch (error) {
    console.error('Error validating vendor invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify password and allow duplicate invoice processing
router.post('/items/verify-duplicate-password', async (req, res) => {
  try {
    const { password, billNo } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'];
    
    console.log(`🔐 Attempting password verification for Bill No: ${billNo}`);
    
    if (!password || !billNo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password and billNo are required' 
      });
    }
    
    // Get employee from database
    const employeeCheck = await pool.query(
      `SELECT e.employeeid as id, ec.passwordhash FROM employeemaster e
       LEFT JOIN employeecredentials ec ON e.employeeid = ec.employeeid
       WHERE (LOWER(e.firstname) = LOWER($1) OR LOWER(e.lastname) = LOWER($1)) AND e.deletedat IS NULL`,
      ['Ashok']
    );
    
    if (employeeCheck.rows.length === 0) {
      console.log('❌ User Ashok not found in employee table');
      return res.status(401).json({ 
        success: false, 
        message: 'User Ashok not found in system' 
      });
    }
    
    const employee = employeeCheck.rows[0];
    console.log(`✓ Found employee Ashok (ID: ${employee.id}), Password hash exists: ${!!employee.passwordhash}`);
    
    // Verify password using bcrypt
    if (!employee.passwordhash) {
      console.log('❌ No password hash found for Ashok');
      return res.status(401).json({ 
        success: false, 
        message: 'Password not set for this user. Contact administrator.' 
      });
    }
    
    try {
      const passwordMatch = await bcrypt.compare(password, employee.passwordhash);
      
      if (!passwordMatch) {
        console.log('❌ Password mismatch for user Ashok');
        return res.status(401).json({ 
          success: false, 
          message: 'Incorrect password. Invoice reprocessing cancelled.' 
        });
      }
    } catch (bcryptError) {
      console.error('❌ Bcrypt comparison error:', bcryptError.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Error verifying password. Please try again.' 
      });
    }
    
    console.log(`✅ Password verified for user Ashok. Deleting processed file record for Bill No: ${billNo}`);
    
    // Remove the duplicate flag by deleting the processed record
    const deleteResult = await pool.query(
      `DELETE FROM processedfiles
       WHERE billno = $1`,
      [billNo]
    );
    
    console.log(`✓ Deleted ${deleteResult.rowCount} record(s) from processedfiles for Bill No: ${billNo}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Password verified. You can now reprocess this invoice.',
      authorized: true
    });
    
  } catch (error) {
    console.error('❌ Error verifying password:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'An error occurred during password verification' 
    });
  }
});

module.exports = router;
