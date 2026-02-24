const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /api/employees/all - Get all employees for dropdowns
router.get('/employees/all', employeeController.getAllEmployees);

// GET /api/employees/search?q=... - Search employees by name
router.get('/employees/search', employeeController.searchEmployees);

module.exports = router;
