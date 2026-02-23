const express = require('express');
const router = express.Router();
const ItemMaster = require('../models/ItemMaster');

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

module.exports = router;
