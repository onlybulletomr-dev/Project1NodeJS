const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public endpoints (no authentication required)
router.post('/login', authController.login);

// Protected endpoints (authentication required)
router.get('/validate', authController.validate);
router.get('/current-user', authController.getCurrentUser);

module.exports = router;
