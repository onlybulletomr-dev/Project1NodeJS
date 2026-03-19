const express = require('express');
const SerialNumber = require('../models/SerialNumber');
const ItemMaster = require('../models/ItemMaster');
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/serialnumbers
 * Create a new serial number for an item
 * Body: { itemid, serialnumber, branchid, invoicedetailid, vendorid, mrp, manufacturingdate, remarks }
 */
router.post('/', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, serialnumber, invoicedetailid, vendorid, mrp, manufacturingdate, remarks } = req.body;
    const createdby = req.user.employeeId;
    const branchid = req.user.branchId;

    // Validate required fields
    if (!itemid || !serialnumber || !branchid) {
      return res.status(400).json({
        error: 'Missing required fields: itemid, serialnumber, branchid',
      });
    }

    // Check if item exists
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if item allows serial numbers
    if (!item.serialnumbertracking) {
      return res.status(400).json({
        error: `Item '${item.itemname}' is not configured for serial number tracking`,
      });
    }

    // Check for duplicates if not allowed
    if (!item.duplicateserialnumber) {
      const exists = await SerialNumber.exists(itemid, serialnumber, branchid);
      if (exists) {
        return res.status(409).json({
          error: `Serial number '${serialnumber}' already exists for this item`,
        });
      }
    }

    const result = await SerialNumber.create({
      itemid,
      serialnumber,
      branchid,
      invoicedetailid,
      vendorid,
      mrp,
      manufacturingdate,
      status: 'SHELF',
      remarks,
      createdby,
    });

    res.status(201).json({
      message: 'Serial number created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error creating serial number:', error);
    res.status(500).json({ error: error.message || 'Failed to create serial number' });
  }
});

/**
 * GET /api/serialnumbers/:id
 * Get serial number by ID
 */
router.get('/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SerialNumber.getById(id);

    if (!result) {
      return res.status(404).json({ error: 'Serial number not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching serial number:', error);
    res.status(500).json({ error: 'Failed to fetch serial number' });
  }
});

/**
 * GET /api/serialnumbers/item/:itemid/branch/:branchid
 * Get all serial numbers for an item in a specific branch
 */
router.get('/item/:itemid/branch/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, branchid } = req.params;
    const result = await SerialNumber.getByItemAndBranch(itemid, branchid);

    res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching serial numbers:', error);
    res.status(500).json({ error: 'Failed to fetch serial numbers' });
  }
});

/**
 * GET /api/serialnumbers/item/:itemid/latest
 * Get the latest serial number record for an item (for loading previous purchase details)
 */
router.get('/item/:itemid/latest', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;
    const branchid = req.user.branchid;
    const pool = require('../config/db');

    const result = await pool.query(`
      SELECT 
        serialnumberid, itemid, serialnumber, model, batch, 
        manufacturingdate, expirydate, warrexpiry, condition, 
        vendorid, mrp, status, remarks, createdby, createdat
      FROM serialnumber
      WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL
      ORDER BY createdat DESC
      LIMIT 1
    `, [itemid, branchid]);

    if (result.rows.length === 0) {
      return res.json({
        data: null,
        message: 'No previous purchase records found for this item'
      });
    }

    res.json({
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching latest serial number:', error);
    res.status(500).json({ error: 'Failed to fetch latest serial number' });
  }
});

/**
 * GET /api/serialnumbers/search/:serialnumber/branch/:branchid
 * Find a serial number by its string value
 */
router.get('/search/:serialnumber/branch/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { serialnumber, branchid } = req.params;
    const result = await SerialNumber.getBySerialNumber(serialnumber, branchid);

    if (!result) {
      return res.status(404).json({ error: 'Serial number not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error searching serial number:', error);
    res.status(500).json({ error: 'Failed to search serial number' });
  }
});

/**
 * GET /api/serialnumbers/report
 * Get serial number report with optional filters
 * Query: branchid, itemid, dateFrom, dateTo, status, vendorid
 */
router.get('/report', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid, itemid, dateFrom, dateTo, status, vendorid } = req.query;

    if (!branchid) {
      return res.status(400).json({ error: 'branchid is required' });
    }

    const result = await SerialNumber.getReport(
      branchid,
      itemid || null,
      dateFrom || null,
      dateTo || null,
      status || null,
      vendorid || null
    );

    res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * PUT /api/serialnumbers/:id
 * Update serial number (remarks, status)
 */
router.put('/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, status } = req.body;
    const updatedby = req.user.employeeid;

    if (!remarks && !status) {
      return res.status(400).json({ error: 'At least one field (remarks, status) must be provided' });
    }

    if (status) {
      const validStatuses = ['SHELF', 'INVOICED', 'RETURNED', 'SCRAPED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
    }

    const result = await SerialNumber.update(id, { remarks, status, updatedby });

    if (!result) {
      return res.status(404).json({ error: 'Serial number not found' });
    }

    res.json({
      message: 'Serial number updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error updating serial number:', error);
    res.status(500).json({ error: 'Failed to update serial number' });
  }
});

/**
 * DELETE /api/serialnumbers/:id
 * Soft delete serial number
 */
router.delete('/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedby = req.user.employeeid;

    const result = await SerialNumber.delete(id, deletedby);

    if (!result) {
      return res.status(404).json({ error: 'Serial number not found' });
    }

    res.json({
      message: 'Serial number deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting serial number:', error);
    res.status(500).json({ error: 'Failed to delete serial number' });
  }
});

/**
 * GET /api/serialnumbers/status/:status/branch/:branchid
 * Get all serial numbers with a specific status
 * Query: itemid (optional)
 */
router.get('/status/:status/branch/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { status, branchid } = req.params;
    const { itemid } = req.query;

    const validStatuses = ['SHELF', 'INVOICED', 'RETURNED', 'SCRAPED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = await SerialNumber.getByStatus(status, branchid, itemid || null);

    res.json({
      count: result.length,
      status,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching by status:', error);
    res.status(500).json({ error: 'Failed to fetch serial numbers' });
  }
});

/**
 * GET /api/serialnumbers/vendor/:vendorid/branch/:branchid
 * Get all serial numbers from a specific vendor
 * Query: itemid (optional)
 */
router.get('/vendor/:vendorid/branch/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { vendorid, branchid } = req.params;
    const { itemid } = req.query;

    const result = await SerialNumber.getByVendor(vendorid, branchid, itemid || null);

    res.json({
      count: result.length,
      vendorid,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching by vendor:', error);
    res.status(500).json({ error: 'Failed to fetch serial numbers' });
  }
});

/**
 * PUT /api/serialnumbers/:id/status
 * Update only the status of a serial number
 */
router.put('/:id/status', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedby = req.user.employeeid;

    if (!status) {
      return res.status(400).json({ error: 'status field is required' });
    }

    const result = await SerialNumber.updateStatus(id, status, updatedby);

    if (!result) {
      return res.status(404).json({ error: 'Serial number not found' });
    }

    res.json({
      message: `Serial number status updated to ${status}`,
      data: result,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

/**
 * POST /api/serialnumbers/bulk-create
 * Bulk create serial numbers for an invoice item
 * Body: {
 *   invoiceid,
 *   itemid,
 *   invoicedetailid,
 *   serialnumbers: [
 *     { serialnumber, batch, manufacturingdate, expirydate, warrexpiry, condition }
 *   ]
 * }
 */
router.post('/bulk-create', branchAccessMiddleware, async (req, res) => {
  const pool = require('../config/db');
  
  try {
    const { invoiceid, itemid, invoicedetailid, serialnumbers } = req.body;
    const createdby = req.user.employeeid;
    const branchid = req.user.branchid;

    // Validate required fields
    if (!invoiceid || !itemid || !invoicedetailid || !serialnumbers || !Array.isArray(serialnumbers)) {
      return res.status(400).json({
        error: 'Missing required fields: invoiceid, itemid, invoicedetailid, serialnumbers (array)',
      });
    }

    if (serialnumbers.length === 0) {
      return res.status(400).json({
        error: 'At least one serial number is required',
      });
    }

    // Check if item exists and allows serial number tracking
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (!item.serialnumbertracking) {
      return res.status(400).json({
        error: `Item '${item.itemname}' is not configured for serial number tracking`,
      });
    }

    const createdSerials = [];
    const errors = [];

    // Process each serial number
    for (let i = 0; i < serialnumbers.length; i++) {
      const serial = serialnumbers[i];

      // Validate serial number data
      if (!serial.serialnumber || !serial.serialnumber.trim()) {
        errors.push(`Row ${i + 1}: Serial number is required`);
        continue;
      }

      try {
        // Check for duplicates if not allowed
        if (!item.duplicateserialnumber) {
          const exists = await SerialNumber.exists(itemid, serial.serialnumber.trim(), branchid);
          if (exists) {
            errors.push(`Row ${i + 1}: Serial number '${serial.serialnumber}' already exists for this item`);
            continue;
          }
        }

        // Create serial number record
        const result = await pool.query(`
          INSERT INTO serialnumber (
            invoiceid,
            itemid,
            serialnumber,
            batch,
            manufacturingdate,
            expirydate,
            warrexpiry,
            condition,
            branchid,
            status,
            createdby,
            createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
          RETURNING serialnumberid, serialnumber
        `, [
          invoiceid,
          itemid,
          serial.serialnumber.trim(),
          serial.batch || null,
          serial.manufacturingdate || null,
          serial.expirydate || null,
          serial.warrexpiry || null,
          serial.condition || 'New',
          branchid,
          'SHELF',
          createdby,
        ]);

        createdSerials.push({
          serialnumberid: result.rows[0].serialnumberid,
          serialnumber: result.rows[0].serialnumber,
        });
      } catch (err) {
        console.error(`Error creating serial number row ${i + 1}:`, err);
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    // Return result
    res.status(201).json({
      message: `${createdSerials.length} serial number(s) created successfully`,
      created: createdSerials.length,
      createdSerials,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in bulk-create:', error);
    res.status(500).json({ error: error.message || 'Failed to create serial numbers' });
  }
});

/**
 * GET /api/serialnumbers/available/:itemid
 * Get available serial numbers (status='SHELF') for an item in user's branch
 * Optionally filter by vendor
 */
router.get('/available/:itemid', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;
    const { vendorid } = req.query;
    const branchid = req.user.branchid;

    // Get available serial numbers from serialnumber table
    let query = `
      SELECT 
        serialnumberid,
        itemid,
        serialnumber,
        mrp,
        manufacturingdate,
        status,
        batch,
        condition
      FROM serialnumber
      WHERE itemid = $1
        AND branchid = $2
        AND status = 'SHELF'
        AND deletedat IS NULL
    `;
    
    const params = [itemid, branchid];
    
    if (vendorid) {
      query += ` AND vendorid = $3`;
      params.push(vendorid);
    }
    
    query += ` ORDER BY createdat DESC`;

    const result = await req.app?.locals?.pool?.query(query, params) 
      || require('../config/db').query(query, params);

    res.json({
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching available serial numbers:', error);
    res.status(500).json({ error: 'Failed to fetch available serial numbers' });
  }
});

/**
 * POST /api/serialnumbers/batch-create-for-inventory
 * Batch create serial numbers for inventory received from vendor
 * Body: {
 *   itemid,
 *   quantity,
 *   vendorid,
 *   mrp,
 *   manufacturingdate,
 *   manufacturer,
 *   batch,
 *   condition,
 *   serialnumbers: [
 *     { serialnumber, model, batch, manufacturingdate, expirydate, warrexpiry, condition },
 *     ...
 *   ]
 * }
 */
router.post('/batch-create-for-inventory', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid, quantity, vendorid, mrp, manufacturingdate, manufacturer, vendorname, batch, condition, serialnumbers, purchaseinvoiceid } = req.body;
    const createdby = req.user.employeeId;
    const branchid = req.user.branchId;
    const pool = require('../config/db');

    // Validate required fields
    if (!itemid || !serialnumbers || !Array.isArray(serialnumbers) || serialnumbers.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: itemid, serialnumbers (non-empty array)',
      });
    }

    // Check if item exists and allows serial number tracking
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (!item.serialnumbertracking) {
      return res.status(400).json({
        error: `Item '${item.itemname}' is not configured for serial number tracking`,
      });
    }

    const createdSerials = [];
    const errors = [];

    // Process each serial number
    for (let i = 0; i < serialnumbers.length; i++) {
      const serialnumber = serialnumbers[i];

      // Validate serial number
      if (!serialnumber.serialnumber || !serialnumber.serialnumber.trim()) {
        errors.push(`Row ${i + 1}: Serial number cannot be empty`);
        continue;
      }

      try {
        // Check for duplicates if not allowed
        if (!item.duplicateserialnumber) {
          const exists = await SerialNumber.exists(itemid, serialnumber.serialnumber.trim(), branchid);
          if (exists) {
            errors.push(`Row ${i + 1}: Serial number '${serialnumber.serialnumber}' already exists`);
            continue;
          }
        }

        // Create serial number record in SHELF status (inventory received)
        const result = await pool.query(`
          INSERT INTO serialnumber (
            itemid,
            serialnumber,
            model,
            batch,
            manufacturingdate,
            expirydate,
            warrexpiry,
            condition,
            branchid,
            vendorid,
            mrp,
            status,
            manufacturername,
            vendorname,
            purchaseinvoiceid,
            createdby,
            createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
          RETURNING serialnumberid, serialnumber, mrp
        `, [
          itemid,
          serialnumber.serialnumber.trim(),
          serialnumber.model || null,
          serialnumber.batch || null,
          serialnumber.manufacturingdate || null,
          serialnumber.expirydate || null,
          serialnumber.warrexpiry || null,
          serialnumber.condition || 'New',
          branchid,
          vendorid || null,
          mrp || null,
          'SHELF',
          manufacturer || null,
          vendorname || null,
          purchaseinvoiceid || null,
          createdby,
        ]);

        createdSerials.push({
          serialnumberid: result.rows[0].serialnumberid,
          serialnumber: result.rows[0].serialnumber,
          mrp: result.rows[0].mrp,
        });
      } catch (err) {
        console.error(`Error creating serial number:`, err);
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    // Return result
    res.status(201).json({
      message: `${createdSerials.length} serial number(s) created successfully`,
      created: createdSerials.length,
      createdSerials,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in batch-create-for-inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to create serial numbers' });
  }
});

/**
 * GET /api/serialnumbers/item/:itemid/shelf
 * Get all SHELF (available) serial numbers for an item
 * Used during invoicing to select which serials to invoice
 */
router.get('/item/:itemid/shelf', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;
    const branchid = req.user.branchId;
    const pool = require('../config/db');

    const result = await pool.query(`
      SELECT 
        serialnumberid,
        itemid,
        serialnumber,
        model,
        batch,
        manufacturername,
        vendorname,
        mrp,
        manufacturingdate,
        expirydate,
        condition,
        status,
        createdby,
        createdat
      FROM serialnumber
      WHERE itemid = $1
        AND branchid = $2
        AND status = 'SHELF'
        AND deletedat IS NULL
      ORDER BY createdat DESC, serialnumber
    `, [itemid, branchid]);

    res.json({
      success: true,
      data: result.rows || [],
      count: result.rows ? result.rows.length : 0
    });
  } catch (error) {
    console.error('[SHELF ENDPOINT] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch shelf serials' });
  }
});

module.exports = router;

