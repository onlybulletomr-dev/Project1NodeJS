const express = require('express');
const SerialNumberTracking = require('../models/SerialNumberTracking');
const ItemMaster = require('../models/ItemMaster');
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/serialnumbertracking
 * Create a new serial number tracking configuration for an item
 * Body: { itemid, branchid, enabled }
 */
router.post('/', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, branchid, enabled = true } = req.body;
    const createdby = req.user?.employeeid || 1;

    // Validate required fields
    if (!itemid || !branchid) {
      return res.status(400).json({
        error: 'Missing required fields: itemid, branchid',
      });
    }

    // Check if item exists
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if tracking config already exists for this item/branch
    const existing = await SerialNumberTracking.getByItemAndBranch(itemid, branchid);
    if (existing) {
      return res.status(409).json({
        error: 'Serial number tracking configuration already exists for this item and branch'
      });
    }

    const trackingConfig = await SerialNumberTracking.create({
      itemid,
      branchid,
      enabled,
      createdby
    });

    res.status(201).json({
      success: true,
      message: 'Serial number tracking configuration created',
      data: trackingConfig
    });
  } catch (error) {
    console.error('Error creating serial number tracking config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serialnumbertracking/:id
 * Get tracking configuration by ID
 */
router.get('/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const trackingConfig = await SerialNumberTracking.getById(id);

    if (!trackingConfig) {
      return res.status(404).json({ success: false, error: 'Tracking configuration not found' });
    }

    res.status(200).json({ success: true, data: trackingConfig });
  } catch (error) {
    console.error('Error fetching serial number tracking config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serialnumbertracking/item/:itemid/branch/:branchid
 * Get tracking configuration for specific item and branch
 */
router.get('/item/:itemid/branch/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, branchid } = req.params;
    const trackingConfig = await SerialNumberTracking.getByItemAndBranch(itemid, branchid);

    if (!trackingConfig) {
      return res.status(404).json({ success: false, error: 'Tracking configuration not found' });
    }

    res.status(200).json({ success: true, data: trackingConfig });
  } catch (error) {
    console.error('Error fetching serial number tracking config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serialnumbertracking/enabled/:branchid
 * Get all items with serial tracking enabled in a branch
 */
router.get('/enabled/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid } = req.params;
    const items = await SerialNumberTracking.getEnabledByBranch(branchid);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching items with serial tracking enabled:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serialnumbertracking/all/:branchid
 * Get all tracking configurations for a branch
 */
router.get('/all/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid } = req.params;
    const configs = await SerialNumberTracking.getAll(branchid);

    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching all tracking configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serialnumbertracking/summary/:branchid
 * Get tracking summary for a branch
 */
router.get('/summary/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid } = req.params;
    const summary = await SerialNumberTracking.getSummary(branchid);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching tracking summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/serialnumbertracking/:id
 * Update tracking configuration
 */
router.put('/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const updatedby = req.user?.employeeid || 1;

    const trackingConfig = await SerialNumberTracking.update(id, {
      enabled,
      updatedby
    });

    if (!trackingConfig) {
      return res.status(404).json({ success: false, error: 'Tracking configuration not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Serial number tracking configuration updated',
      data: trackingConfig
    });
  } catch (error) {
    console.error('Error updating serial number tracking config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/serialnumbertracking/enable/:itemid/:branchid
 * Enable serial tracking for an item in a branch
 */
router.put('/enable/:itemid/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, branchid } = req.params;
    const updatedby = req.user?.employeeid || 1;

    const trackingConfig = await SerialNumberTracking.enable(itemid, branchid, updatedby);

    if (!trackingConfig) {
      return res.status(404).json({ success: false, error: 'Tracking configuration not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Serial number tracking enabled for item',
      data: trackingConfig
    });
  } catch (error) {
    console.error('Error enabling serial tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/serialnumbertracking/disable/:itemid/:branchid
 * Disable serial tracking for an item in a branch
 */
router.put('/disable/:itemid/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, branchid } = req.params;
    const updatedby = req.user?.employeeid || 1;

    const trackingConfig = await SerialNumberTracking.disable(itemid, branchid, updatedby);

    if (!trackingConfig) {
      return res.status(404).json({ success: false, error: 'Tracking configuration not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Serial number tracking disabled for item',
      data: trackingConfig
    });
  } catch (error) {
    console.error('Error disabling serial tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/serialnumbertracking/:id
 * Soft delete tracking configuration
 */
router.delete('/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedby = req.user?.employeeid || 1;

    const trackingConfig = await SerialNumberTracking.delete(id, updatedby);

    if (!trackingConfig) {
      return res.status(404).json({ success: false, error: 'Tracking configuration not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Serial number tracking configuration deleted',
      data: trackingConfig
    });
  } catch (error) {
    console.error('Error deleting serial number tracking config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
