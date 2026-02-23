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

module.exports = router;
