const express = require('express');
const router = express.Router();
const ItemMaster = require('../models/ItemMaster');
const ItemDetail = require('../models/ItemDetail');
const pool = require('../config/db');

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
      const reorderLevel = 2;
      const reorderQty = 1;

      itemDetail = await ItemDetail.create(
        itemId, 
        branchId, 
        qtyToAdd, 
        taxId, 
        reorderLevel, 
        reorderQty, 
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

module.exports = router;
