const express = require('express');
const vehicleManufacturerController = require('../controllers/vehicleManufacturerController');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

// Vehicle Manufacturer Routes
router.get('/vehicle-manufacturers', vehicleManufacturerController.getAllManufacturers);
router.get('/vehicle-manufacturers/:id', vehicleManufacturerController.getManufacturerById);
router.post('/vehicle-manufacturers', vehicleManufacturerController.createManufacturer);
router.put('/vehicle-manufacturers/:id', vehicleManufacturerController.updateManufacturer);
router.delete('/vehicle-manufacturers/:id', vehicleManufacturerController.deleteManufacturer);

// Unique data routes (MUST come before parameterized routes)
router.get('/vehicles/unique/models', vehicleController.getUniqueModels);
router.get('/vehicles/unique/colors', vehicleController.getUniqueColors);

// Vehicle Routes
router.get('/vehicles', vehicleController.getAllVehicles);
router.get('/vehicles/:id', vehicleController.getVehicleById);
router.get('/customer/:customerId/vehicles', vehicleController.getVehiclesByCustomerId);
router.post('/vehicles', vehicleController.createVehicle);
router.put('/vehicles/:id', vehicleController.updateVehicle);
router.delete('/vehicles/:id', vehicleController.deleteVehicle);

module.exports = router;
