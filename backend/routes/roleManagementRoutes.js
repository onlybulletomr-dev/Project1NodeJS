const express = require('express');
const router = express.Router();
const roleManagementController = require('../controllers/roleManagementController');

// Get all employees with their roles and branches
router.get('/employees', roleManagementController.getAllEmployeesWithRoles);

// Get all branches
router.get('/branches', roleManagementController.getAllBranches);

// Update single employee role
router.put('/employees/:employeeid/role', roleManagementController.updateEmployeeRole);

// Bulk update roles
router.post('/employees/bulk-update', roleManagementController.bulkUpdateRoles);

module.exports = router;
