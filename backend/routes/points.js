const express = require('express');
const PointsTransaction = require('../models/PointsTransaction');
const ItemMaster = require('../models/ItemMaster');
const InvoiceMaster = require('../models/InvoiceMaster');
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/points/transaction
 * Create a new points transaction for vendor purchase
 * Points are automatically taken from the item's points field
 * Body: { invoiceid, itemid, invoicedetailid, branchid, quantitypurchased, remarks }
 */
router.post('/transaction', branchAccessMiddleware, async (req, res) => {
  try {
    const {
      invoiceid,
      itemid,
      invoicedetailid,
      branchid,
      quantitypurchased,
      remarks = null,
    } = req.body;
    const createdby = req.user.employeeid;

    // Validate required fields
    if (!invoiceid || !itemid || !invoicedetailid || !branchid || !quantitypurchased) {
      return res.status(400).json({
        error: 'Missing required fields: invoiceid, itemid, invoicedetailid, branchid, quantitypurchased',
      });
    }

    // Verify invoice exists
    const invoice = await InvoiceMaster.getById(invoiceid);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Verify item exists
    const item = await ItemMaster.getById(itemid);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const result = await PointsTransaction.create({
      invoiceid,
      itemid,
      invoicedetailid,
      branchid,
      quantitypurchased,
      transactiontype: 'PURCHASE',
      remarks,
      createdby,
    });

    res.status(201).json({
      message: 'Points transaction created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error creating points transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to create points transaction' });
  }
});

/**
 * GET /api/points/transaction/:id
 * Get points transaction by ID
 */
router.get('/transaction/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await PointsTransaction.getById(id);

    if (!result) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * GET /api/points/branch/:branchid
 * Get all transactions for a branch (paginated)
 * Query: limit, offset
 */
router.get('/branch/:branchid', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const result = await PointsTransaction.getByBranch(branchid, limit, offset);

    res.json({
      count: result.length,
      limit,
      offset,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/points/invoice/:invoiceid
 * Get all points transactions for a specific invoice
 */
router.get('/invoice/:invoiceid', branchAccessMiddleware, async (req, res) => {
  try {
    const { invoiceid } = req.params;
    const result = await PointsTransaction.getByInvoice(invoiceid);

    res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching invoice transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/points/item/:itemid/total
 * Get total points awarded for an item
 * Query: branchid (optional)
 */
router.get('/item/:itemid/total', branchAccessMiddleware, async (req, res) => {
  try {
    const { itemid } = req.params;
    const { branchid } = req.query;

    const result = await PointsTransaction.getTotalPointsByItem(itemid, branchid || null);

    res.json({
      itemid,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching total points:', error);
    res.status(500).json({ error: 'Failed to fetch total points' });
  }
});

/**
 * GET /api/points/report/purchase
 * Get purchase report with points breakdown
 * Query: branchid, dateFrom, dateTo
 */
router.get('/report/purchase', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid, dateFrom, dateTo } = req.query;

    if (!branchid) {
      return res.status(400).json({ error: 'branchid is required' });
    }

    const result = await PointsTransaction.getPurchaseReport(
      branchid,
      dateFrom || null,
      dateTo || null
    );

    res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error generating purchase report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/points/report/summary
 * Get points summary report (total points per item)
 * Query: branchid
 */
router.get('/report/summary', branchAccessMiddleware, async (req, res) => {
  try {
    const { branchid } = req.query;

    if (!branchid) {
      return res.status(400).json({ error: 'branchid is required' });
    }

    const result = await PointsTransaction.getPointsSummaryReport(branchid);

    res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error generating summary report:', error);
    res.status(500).json({ error: 'Failed to generate summary report' });
  }
});

/**
 * DELETE /api/points/transaction/:id
 * Soft delete transaction (reverse a purchase)
 */
router.delete('/transaction/:id', branchAccessMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedby = req.user.employeeid;

    const result = await PointsTransaction.delete(id, deletedby);

    if (!result) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      message: 'Transaction deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;

