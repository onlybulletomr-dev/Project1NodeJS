const express = require('express');
const pool = require('../config/db');
const ItemMaster = require('../models/ItemMaster');
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * PUT /api/itemmaster/:itemid/serialconfig
 * Update serial number configuration for an item
 * Body: { duplicateserialnumber }
 * Note: serialnumbertracking is configured separately - when enabled, items must have serial numbers
 */
router.put('/:itemid/serialconfig', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;
    const { duplicateserialnumber } = req.body;
    const updatedby = req.user.employeeid;

    // Validate item exists
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Validate input
    if (typeof duplicateserialnumber !== 'undefined' && typeof duplicateserialnumber !== 'boolean') {
      return res.status(400).json({ error: 'duplicateserialnumber must be a boolean' });
    }

    // Update configuration
    const result = await ItemMaster.updateSerialNumberConfig(itemid, {
      duplicateserialnumber,
      updatedby,
    });

    res.json({
      message: 'Serial number configuration updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error updating serial config:', error);
    res.status(500).json({ error: error.message || 'Failed to update configuration' });
  }
});

/**
 * PUT /api/itemmaster/:itemid/points
 * Update points value for an item
 * Body: { points }
 * Points are awarded by vendor for each purchase of this item
 */
router.put('/:itemid/points', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;
    const { points } = req.body;
    const updatedby = req.user.employeeid;

    // Validate item exists
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Validate input
    if (typeof points !== 'number' || points < 0) {
      return res.status(400).json({ error: 'points must be a non-negative number' });
    }

    // Update points
    const result = await pool.query(
      `UPDATE itemmaster 
       SET points = $1, updatedby = $2, updatedat = CURRENT_TIMESTAMP
       WHERE itemid = $3 AND deletedat IS NULL
       RETURNING *`,
      [points, updatedby, itemid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      message: 'Item points updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating item points:', error);
    res.status(500).json({ error: error.message || 'Failed to update points' });
  }
});

/**
 * GET /api/itemmaster/serialconfig/required
 * Get all items that require serial numbers
 */
router.get('/serialconfig/required', branchAccessMiddleware, async (req, res) => {
  try {
    const result = await ItemMaster.getSerialNumberRequiredItems();

    res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching serial items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

/**
 * GET /api/itemmaster/:itemid/hasserial
 * Check item's serial number and points configuration
 */
router.get('/:itemid/hasserial', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;

    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const hasSerial = await ItemMaster.hasSerialNumberTracking(itemid);
    const allowsDuplicate = await ItemMaster.allowsDuplicateSerialNumbers(itemid);
    const points = await ItemMaster.getPoints(itemid);

    res.json({
      itemid,
      partnumber: item.partnumber,
      itemname: item.itemname,
      serialnumbertracking: hasSerial,
      duplicateserialnumber: allowsDuplicate,
      points: points,
    });
  } catch (error) {
    console.error('Error checking configuration:', error);
    res.status(500).json({ error: 'Failed to check configuration' });
  }
});

module.exports = router;

