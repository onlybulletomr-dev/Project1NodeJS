const express = require('express');
const companyController = require('../controllers/companyController');

const router = express.Router();

// Company routes
router.post('/companies', companyController.createCompany);
router.get('/companies', companyController.getAllCompanies);
router.get('/companies/:id', companyController.getCompanyById);
router.get('/companies/:branchId/config', companyController.getCompanyConfig);
router.put('/companies/:id', companyController.updateCompany);
router.delete('/companies/:id', companyController.deleteCompany);

module.exports = router;
