const express = require('express');
const router = express.Router();
const ServiceMaster = require('../models/ServiceMaster');
const pool = require('../config/db');

// Search services by name or description
router.get('/services/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }
    const services = await ServiceMaster.searchByServiceName(q);
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error searching services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all services
router.get('/services', async (req, res) => {
  try {
    const services = await ServiceMaster.getAll();
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get service by ID
router.get('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await ServiceMaster.getById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Combined search for items and services
router.get('/items-services/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const userId = req.headers['x-user-id'] || 1;

    const userResult = await pool.query(
      `SELECT branchid FROM employeemaster WHERE employeeid = $1 AND deletedat IS NULL LIMIT 1`,
      [userId]
    );
    const userBranchId = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    const itemMasterColumnsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'itemmaster'`
    );
    const itemDetailColumnsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'itemdetail'`
    );

    const itemMasterColumns = new Set(itemMasterColumnsResult.rows.map(row => row.column_name));
    const itemDetailColumns = new Set(itemDetailColumnsResult.rows.map(row => row.column_name));

    const descriptionColumn = itemMasterColumns.has('description') ? 'description' : 'itemname';

    const stockColumnCandidates = ['quantityonhand', 'qtyonhand', 'quantity', 'qty'];
    const stockColumn = stockColumnCandidates.find(column => itemDetailColumns.has(column)) || null;

    const stockExpression = stockColumn ? `COALESCE(stock.${stockColumn}, 0)` : '0';

    const itemsQuery = `
      SELECT
        im.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.${descriptionColumn} AS itemname,
        im.uom,
        im.mrp,
        ${stockExpression} AS availableqty
      FROM itemmaster im
      LEFT JOIN (
        SELECT itemid, ${stockColumn ? `SUM(${stockColumn})` : '0'} AS ${stockColumn || 'stockqty'}
        FROM itemdetail
        WHERE branchid = $2 AND deletedat IS NULL
        GROUP BY itemid
      ) stock ON stock.itemid = im.itemid
      WHERE (im.partnumber ILIKE $1 OR im.${descriptionColumn} ILIKE $1)
        AND im.deletedat IS NULL
      ORDER BY im.partnumber
      LIMIT 20
    `;

    const servicesQuery = `
      SELECT serviceid, servicename, description, defaultrate
      FROM servicemaster
      WHERE (servicename ILIKE $1 OR description ILIKE $1)
        AND deletedat IS NULL
      ORDER BY servicename
      LIMIT 20
    `;

    const [itemsResult, servicesResult] = await Promise.all([
      pool.query(itemsQuery, [`%${q}%`, userBranchId]),
      pool.query(servicesQuery, [`%${q}%`])
    ]);

    const items = itemsResult.rows;
    const services = servicesResult.rows;

    // Add source field to distinguish between items and services
    const enrichedItems = items.map(item => ({
      ...item,
      source: 'item',
      itemnumber: item.partnumber,
      itemdescription: item.itemdescription || item.itemname,
      itemprice: item.mrp,
      availableqty: item.availableqty
    }));

    const enrichedServices = services.map(service => ({
      ...service,
      source: 'service',
      itemnumber: String(service.serviceid),
      itemdescription: service.servicename,
      itemprice: service.defaultrate,
      availableqty: null
    }));

    const combined = [...enrichedItems, ...enrichedServices];
    res.status(200).json({ success: true, data: combined });
  } catch (error) {
    console.error('Error searching items and services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ALL items and services combined (without search filter) - for Invoice screen
// This endpoint gets items from itemmaster ONLY (no itemdetail join)
router.get('/items-services/all', async (req, res) => {
  try {
    const itemMasterColumnsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'itemmaster'`
    );

    const itemMasterColumns = new Set(itemMasterColumnsResult.rows.map(row => row.column_name));
    const descriptionColumn = itemMasterColumns.has('description') ? 'description' : 'itemname';

    // Get all items from itemmaster ONLY (no itemdetail join, no qty field)
    const itemsQuery = `
      SELECT
        im.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.${descriptionColumn} AS itemname,
        im.uom,
        im.mrp
      FROM itemmaster im
      WHERE im.deletedat IS NULL
      ORDER BY im.partnumber
      LIMIT 500
    `;

    // Get all services
    const servicesQuery = `
      SELECT serviceid, servicename, description, defaultrate
      FROM servicemaster
      WHERE deletedat IS NULL
      ORDER BY servicename
      LIMIT 500
    `;

    const [itemsResult, servicesResult] = await Promise.all([
      pool.query(itemsQuery),
      pool.query(servicesQuery)
    ]);

    const items = itemsResult.rows;
    const services = servicesResult.rows;

    // Add source field to distinguish between items and services
    const enrichedItems = items.map(item => ({
      ...item,
      source: 'item',
      itemnumber: item.partnumber,
      itemdescription: item.itemdescription || item.itemname,
      itemprice: item.mrp
    }));

    const enrichedServices = services.map(service => ({
      ...service,
      source: 'service',
      itemnumber: String(service.serviceid),
      itemdescription: service.servicename,
      itemprice: service.defaultrate
    }));

    const combined = [...enrichedItems, ...enrichedServices];
    res.status(200).json({ success: true, data: combined });
  } catch (error) {
    console.error('Error fetching all items and services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
