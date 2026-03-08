const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

// All invoice routes protected with branch access middleware
// Save new invoice
router.post('/invoices', branchAccessMiddleware, invoiceController.saveInvoice);

// Get all invoices for user's branch
router.get('/invoices', branchAccessMiddleware, invoiceController.getAllInvoices);

// Get invoice by ID with branch verification
router.get('/invoices/:id', branchAccessMiddleware, invoiceController.getInvoiceById);

// Update invoice with branch verification
router.put('/invoices/:id', branchAccessMiddleware, invoiceController.updateInvoice);

// Delete invoice with branch verification
router.delete('/invoices/:id', branchAccessMiddleware, invoiceController.deleteInvoice);

// DEBUG: Check recent invoices in user's branch
router.get('/debug/invoices/recent/:branchId', async (req, res) => {
  try {
    const pool = require('../config/db');
    const { branchId } = req.params;
    
    const result = await pool.query(
      `SELECT invoiceid, invoicenumber, vehiclenumber, createdby, createdat, paymentstatus
       FROM invoicemaster 
       WHERE branchid = $1 AND deletedat IS NULL
       ORDER BY createdat DESC 
       LIMIT 20`,
      [branchId]
    );
    
    res.status(200).json({
      success: true,
      branch: branchId,
      count: result.rows.length,
      recent_invoices: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
