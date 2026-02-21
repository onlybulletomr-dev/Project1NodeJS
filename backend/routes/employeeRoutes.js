const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /api/employees/search?q=...
router.get('/employees/search', employeeController.searchEmployees);

module.exports = router;
