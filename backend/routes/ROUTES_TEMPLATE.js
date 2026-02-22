// ============================================
// TEMPLATE: How to Update Routes
// ============================================
// Apply this pattern to: customerRoutes, vehicleRoutes, itemRoutes, etc.

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

// ALL ROUTES protected with branch access middleware
// The middleware automatically extracts the user's branch from the x-user-id header

// Get all customers for user's branch
router.get('/customers', branchAccessMiddleware, customerController.getAllCustomers);

// Get specific customer (with branch verification)
router.get('/customers/:id', branchAccessMiddleware, customerController.getCustomerById);

// Create new customer (auto-assigned to user's branch)
router.post('/customers', branchAccessMiddleware, customerController.createCustomer);

// Update customer (branch-verified)
router.put('/customers/:id', branchAccessMiddleware, customerController.updateCustomer);

// Delete customer (branch-verified)
router.delete('/customers/:id', branchAccessMiddleware, customerController.deleteCustomer);

module.exports = router;

// ============================================
// KEY POINTS:
// ============================================
// 1. ALWAYS add branchAccessMiddleware to EVERY route
// 2. Middleware runs BEFORE controller
// 3. Middleware attaches req.user with: userId, employeeId, firstName, lastName, branchId, role
// 4. Controller uses req.user.branchId to filter/verify data
// 5. If middleware fails (no user/no branch access), response sent directly - controller never runs
