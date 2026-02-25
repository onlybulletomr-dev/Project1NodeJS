const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public endpoints (no authentication required)
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/set-password', authController.setPassword);
router.get('/employee-info', authController.getEmployeeInfo);

// Protected endpoints (authentication required)
router.get('/validate', authController.validate);
router.get('/current-user', authController.getCurrentUser);

module.exports = router;

