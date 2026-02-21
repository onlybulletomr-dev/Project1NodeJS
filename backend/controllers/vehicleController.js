const Vehicle = require('../models/Vehicle');

exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.getAll();
    res.status(200).json({
      success: true,
      message: 'All vehicles retrieved successfully',
      data: vehicles,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicles',
      error: err.message,
    });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.getById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Vehicle retrieved successfully',
      data: vehicle,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle',
      error: err.message,
    });
  }
};

exports.getVehiclesByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    const vehicles = await Vehicle.getByCustomerId(customerId);
    res.status(200).json({
      success: true,
      message: 'Vehicles retrieved successfully',
      data: vehicles,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicles',
      error: err.message,
    });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const { CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, CreatedBy } = req.body;
    
    if (!CustomerID || !ManufacturerID || !RegistrationNumber || !Color) {
      return res.status(400).json({
        success: false,
        message: 'CustomerID, ManufacturerID, RegistrationNumber, and Color are required',
      });
    }

    const newVehicle = await Vehicle.create({
      CustomerID,
      ManufacturerID,
      RegistrationNumber,
      Color,
      ChassisNumber,
      EngineNumber,
      ManufacturingYear,
      PurchaseDate,
      CreatedBy: CreatedBy || 1,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: newVehicle,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle',
      error: err.message,
    });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, UpdatedBy } = req.body;

    const updatedVehicle = await Vehicle.update(id, {
      CustomerID,
      ManufacturerID,
      RegistrationNumber,
      Color,
      ChassisNumber,
      EngineNumber,
      ManufacturingYear,
      PurchaseDate,
      UpdatedBy: UpdatedBy || 1,
    });

    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle',
      error: err.message,
    });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { DeletedBy } = req.body;

    const deletedVehicle = await Vehicle.delete(id, {
      DeletedBy: DeletedBy || 1,
    });

    if (!deletedVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully',
      data: deletedVehicle,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle',
      error: err.message,
    });
  }
};

exports.getUniqueModels = async (req, res) => {
  try {
    const models = await Vehicle.getUniqueModels();
    res.status(200).json({
      success: true,
      message: 'Unique models retrieved successfully',
      data: models,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve unique models',
      error: err.message,
    });
  }
};

exports.getUniqueColors = async (req, res) => {
    // ...
  try {
    const model = req.query.model;
      // ...
    const colors = await Vehicle.getUniqueColors(model);
      // ...
    res.status(200).json({
      success: true,
      message: 'Unique colors retrieved successfully',
      data: colors,
    });
  } catch (err) {
      // ...
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve unique colors',
      error: err.message,
    });
  }
};
