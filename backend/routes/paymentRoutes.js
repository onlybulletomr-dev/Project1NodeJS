const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Get all unpaid invoices
router.get('/unpaid', paymentController.getUnpaidInvoices);

// Get unpaid invoices for a specific vehicle
router.get('/unpaid/vehicle/:vehicleId', paymentController.getUnpaidInvoicesByVehicle);

// Get payment summary/statistics
router.get('/summary', paymentController.getPaymentSummary);

// Update payment status for an invoice
router.put('/:InvoiceID', paymentController.updatePaymentStatus);

module.exports = router;
