const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Save new invoice
router.post('/invoices', invoiceController.saveInvoice);

// Get all invoices
router.get('/invoices', invoiceController.getAllInvoices);

// Get invoice by ID
router.get('/invoices/:id', invoiceController.getInvoiceById);

// Update invoice
router.put('/invoices/:id', invoiceController.updateInvoice);

// Delete invoice
router.delete('/invoices/:id', invoiceController.deleteInvoice);

module.exports = router;
