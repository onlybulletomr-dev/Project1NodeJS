const express = require('express');
const vehicleDetailController = require('../controllers/vehicleDetailController');

const router = express.Router();

// Vehicle Detail Routes
router.post('/vehicle-details', vehicleDetailController.createVehicleDetail);
router.get('/vehicle-details', vehicleDetailController.getAllVehicleDetails);
router.get('/vehicle-details/:id', vehicleDetailController.getVehicleDetailById);
router.get('/customer/:customerId/vehicle-details', vehicleDetailController.getVehicleDetailsByCustomerId);
router.put('/vehicle-details/:id', vehicleDetailController.updateVehicleDetail);
router.delete('/vehicle-details/:id', vehicleDetailController.deleteVehicleDetail);

module.exports = router;
