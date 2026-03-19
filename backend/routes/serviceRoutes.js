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

// Combined search for items and services (INVOICE+ MODE)
// Fetches items PRIMARY from itemdetail (with qty data for validation)
router.get('/items-services/search', async (req, res) => {
  try {
    const { q } = req.query;
    // Allow empty query (returns all items) or search by pattern

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

    // For invoice+, fetch PRIMARY from itemdetail with qty info
    // Also include items with serialnumbertracking=true even if they have no itemdetail
    const searchPattern = (q && q.length > 0) ? `%${q}%` : '%';
    
    const itemsQuery = `
      SELECT DISTINCT
        im.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.${descriptionColumn} AS itemname,
        im.uom,
        im.mrp,
        im.points,
        im.duplicateserialnumber,
        im.serialnumbertracking,
        im.servicechargeid,
        im.servicechargemethod,
        ${stockColumn ? `COALESCE(id.${stockColumn}, 0)` : '0'} AS availableqty,
        'itemdetail' AS source_type
      FROM itemdetail id
      JOIN itemmaster im ON id.itemid = im.itemid
      WHERE id.branchid = $2 
        AND id.deletedat IS NULL 
        AND im.deletedat IS NULL
        AND (im.partnumber ILIKE $1 OR im.${descriptionColumn} ILIKE $1)
      
      UNION
      
      SELECT DISTINCT
        im.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.${descriptionColumn} AS itemname,
        im.uom,
        im.mrp,
        im.points,
        im.duplicateserialnumber,
        im.serialnumbertracking,
        im.servicechargeid,
        im.servicechargemethod,
        0 AS availableqty,
        'itemmaster' AS source_type
      FROM itemmaster im
      WHERE im.serialnumbertracking = true
        AND im.deletedat IS NULL
        AND (im.partnumber ILIKE $1 OR im.${descriptionColumn} ILIKE $1)
        AND NOT EXISTS (SELECT 1 FROM itemdetail WHERE itemid = im.itemid AND branchid = $2)
      
      UNION
      
      SELECT DISTINCT
        im.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.${descriptionColumn} AS itemname,
        im.uom,
        im.mrp,
        im.points,
        im.duplicateserialnumber,
        im.serialnumbertracking,
        im.servicechargeid,
        im.servicechargemethod,
        0 AS availableqty,
        'itemmaster' AS source_type
      FROM itemmaster im
      WHERE im.deletedat IS NULL
        AND (im.partnumber ILIKE $1 OR im.${descriptionColumn} ILIKE $1)
        AND NOT EXISTS (SELECT 1 FROM itemdetail WHERE itemid = im.itemid)
      
      ORDER BY partnumber
    `;

    const servicesQuery = `
      SELECT serviceid, servicenumber, servicename, description, defaultrate
      FROM servicemaster
      WHERE (servicename ILIKE $1 OR servicenumber ILIKE $1 OR description ILIKE $1)
        AND deletedat IS NULL
      ORDER BY servicenumber, servicename
    `;

    const [itemsResult, servicesResult] = await Promise.all([
      pool.query(itemsQuery, [searchPattern, userBranchId]),
      pool.query(servicesQuery, [searchPattern])
    ]);

    const items = itemsResult.rows;
    const services = servicesResult.rows;

    console.log(`🔍 Search query: "${q || 'all'}" - Found ${items.length} items (from itemdetail + serial-tracked itemmaster), ${services.length} services`);

    // Add source field to distinguish between items and services
    const enrichedItems = items.map(item => ({
      ...item,
      source: 'item',
      itemnumber: item.partnumber,
      itemdescription: item.itemdescription || item.itemname,
      itemprice: item.mrp,
      availableqty: Number(item.availableqty)
    }));

    const enrichedServices = services.map(service => ({
      ...service,
      source: 'service',
      itemnumber: service.servicenumber,
      itemdescription: service.servicename,
      itemname: service.servicename,
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
    const pointsColumn = itemMasterColumns.has('points') ? 'im.points' : 'NULL as points';
    const duplicateSerialColumn = itemMasterColumns.has('duplicateserialnumber') ? 'im.duplicateserialnumber' : 'NULL as duplicateserialnumber';

    // Get all items from itemmaster ONLY (no itemdetail join, no qty field)
    // Removed LIMIT to fetch all items
    const itemsQuery = `
      SELECT
        im.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.${descriptionColumn} AS itemname,
        im.uom,
        im.mrp,
        ${pointsColumn},
        ${duplicateSerialColumn},
        im.serialnumbertracking
      FROM itemmaster im
      WHERE im.deletedat IS NULL
      ORDER BY im.partnumber
    `;

    // Get all services
    const servicesQuery = `
      SELECT serviceid, servicenumber, servicename, description, defaultrate
      FROM servicemaster
      WHERE deletedat IS NULL
      ORDER BY servicenumber, servicename
    `;

    const [itemsResult, servicesResult] = await Promise.all([
      pool.query(itemsQuery),
      pool.query(servicesQuery)
    ]);

    const items = itemsResult.rows;
    const services = servicesResult.rows;

    console.log(`✓ Fetched ${items.length} items from itemmaster`);
    console.log(`✓ Fetched ${services.length} services from servicemaster`);

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
      itemnumber: service.servicenumber,
      itemdescription: service.servicename,
      itemname: service.servicename,
      itemprice: service.defaultrate
    }));

    const combined = [...enrichedItems, ...enrichedServices];
    res.status(200).json({ success: true, data: combined });
  } catch (error) {
    console.error('Error fetching all items and services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to check a specific item by part number
router.get('/debug/item/:partnumber', async (req, res) => {
  try {
    const { partnumber } = req.params;
    
    // Check itemmaster
    const itemMasterResult = await pool.query(
      `SELECT itemid, partnumber, itemname, deletedat FROM itemmaster WHERE partnumber = $1`,
      [partnumber]
    );
    
    if (itemMasterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item ${partnumber} not found in itemmaster`
      });
    }
    
    const itemMaster = itemMasterResult.rows[0];
    const itemid = itemMaster.itemid;
    
    // Check itemdetail for all branches
    const itemDetailAllBranchesResult = await pool.query(
      `SELECT itemid, branchid, quantityonhand, qtyonhand, quantity, qty, deletedat 
       FROM itemdetail 
       WHERE itemid = $1
       ORDER BY branchid`,
      [itemid]
    );
    
    // Check itemdetail for user's branch
    const userId = req.headers['x-user-id'] || 1;
    const userBranchResult = await pool.query(
      `SELECT branchid FROM employeemaster WHERE employeeid = $1 AND deletedat IS NULL LIMIT 1`,
      [userId]
    );
    const userBranchId = userBranchResult.rows.length > 0 ? userBranchResult.rows[0].branchid : 1;
    
    const itemDetailUserBranchResult = await pool.query(
      `SELECT itemid, branchid, quantityonhand, qtyonhand, quantity, qty, deletedat 
       FROM itemdetail 
       WHERE itemid = $1 AND branchid = $2`,
      [itemid, userBranchId]
    );
    
    // Detect which qty column exists
    const stockColumnCandidates = ['quantityonhand', 'qtyonhand', 'quantity', 'qty'];
    const columnCheckResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'itemdetail' 
       AND column_name IN ('quantityonhand', 'qtyonhand', 'quantity', 'qty')`
    );
    const availableColumns = columnCheckResult.rows.map(r => r.column_name);
    
    res.status(200).json({
      success: true,
      data: {
        partnumber,
        itemid,
        itemMaster: {
          ...itemMaster,
          exists: true,
          isDeleted: itemMaster.deletedat !== null
        },
        availableQtyColumns: availableColumns,
        itemDetailInAllBranches: itemDetailAllBranchesResult.rows,
        itemDetailInUserBranch: {
          branchid: userBranchId,
          records: itemDetailUserBranchResult.rows,
          count: itemDetailUserBranchResult.rows.length
        },
        message: itemDetailUserBranchResult.rows.length === 0 
          ? `⚠️ Item ${partnumber} (ID: ${itemid}) exists in itemmaster but NOT in itemdetail for branch ${userBranchId}` 
          : `✓ Item ${partnumber} found in itemdetail for branch ${userBranchId}`
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to test search results for a specific item
router.get('/debug/search-item/:partnumber', async (req, res) => {
  try {
    const { partnumber } = req.params;
    const userId = req.headers['x-user-id'] || 1;

    // Get user's branch
    const userBranchResult = await pool.query(
      `SELECT branchid FROM employeemaster WHERE employeeid = $1 AND deletedat IS NULL LIMIT 1`,
      [userId]
    );
    const userBranchId = userBranchResult.rows.length > 0 ? userBranchResult.rows[0].branchid : 1;

    // Get column names
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

    // Test 1: Check itemmaster
    const itemMasterCheck = await pool.query(
      `SELECT itemid, partnumber, ${descriptionColumn} as description, deletedat FROM itemmaster WHERE partnumber ILIKE $1`,
      [`%${partnumber}%`]
    );

    // Test 2: Check itemdetail for this item in user's branch
    const itemDetailCheck = await pool.query(
      `SELECT id.itemid, id.branchid, id.deletedat, ${stockColumn ? `id.${stockColumn} as stock_qty` : 'NULL as stock_qty'}
       FROM itemdetail id
       WHERE id.itemid IN (SELECT itemid FROM itemmaster WHERE partnumber ILIKE $1)
       ORDER BY id.branchid`,
      [`%${partnumber}%`]
    );

    // Test 3: Run the exact search query
    const searchPattern = `%${partnumber}%`;

    const searchQuery = `
      SELECT DISTINCT
        id.itemid,
        im.partnumber,
        im.${descriptionColumn} AS itemdescription,
        im.uom,
        im.mrp,
        ${stockColumn ? `COALESCE(id.${stockColumn}, 0)` : '0'} AS availableqty,
        id.branchid,
        id.deletedat
      FROM itemdetail id
      JOIN itemmaster im ON id.itemid = im.itemid
      WHERE id.branchid = $2 
        AND id.deletedat IS NULL 
        AND im.deletedat IS NULL
        AND (im.partnumber ILIKE $1 OR im.${descriptionColumn} ILIKE $1)
      ORDER BY im.partnumber
    `;

    const searchResult = await pool.query(searchQuery, [searchPattern, userBranchId]);

    res.status(200).json({
      success: true,
      data: {
        partnumber,
        userId,
        userBranchId,
        stockColumn,
        detailsColumn: descriptionColumn,
        tests: {
          itemMasterCheck: {
            found: itemMasterCheck.rows.length,
            items: itemMasterCheck.rows
          },
          itemDetailCheck: {
            found: itemDetailCheck.rows.length,
            items: itemDetailCheck.rows
          },
          searchQueryResult: {
            found: searchResult.rows.length,
            items: searchResult.rows,
            query: searchQuery.substring(0, 200) + '...'
          }
        },
        analysis: {
          inItemMaster: itemMasterCheck.rows.length > 0,
          inItemDetail: itemDetailCheck.rows.length > 0,
          searchReturned: searchResult.rows.length > 0,
          itemDetailForUserBranch: itemDetailCheck.rows.filter(r => r.branchid === userBranchId).length > 0,
          itemDetailNotDeleted: itemDetailCheck.rows.filter(r => r.deletedat === null).length > 0
        }
      }
    });
  } catch (error) {
    console.error('Error in debug search endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
