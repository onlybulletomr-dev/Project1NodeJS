const express = require('express');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Customer routes
router.post('/customers', customerController.createCustomer);
router.get('/customers', customerController.getAllCustomers);
router.get('/customers/:id', customerController.getCustomerById);
router.put('/customers/:id', customerController.updateCustomer);
router.delete('/customers/:id', customerController.deleteCustomer);
router.get('/customers/branch/:branchId', customerController.getCustomersByBranch);

module.exports = router;
