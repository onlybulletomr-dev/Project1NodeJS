const VehicleManufacturer = require('../models/VehicleManufacturer');

exports.getAllManufacturers = async (req, res) => {
  try {
    const manufacturers = await VehicleManufacturer.getAll();
    res.status(200).json({
      success: true,
      message: 'All manufacturers retrieved successfully',
      data: manufacturers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve manufacturers',
      error: err.message,
    });
  }
};

exports.getManufacturerById = async (req, res) => {
  try {
    const { id } = req.params;
    const manufacturer = await VehicleManufacturer.getById(id);
    if (!manufacturer) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Manufacturer retrieved successfully',
      data: manufacturer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve manufacturer',
      error: err.message,
    });
  }
};

exports.createManufacturer = async (req, res) => {
  try {
    const { ManufacturerName, ModelName, CreatedBy } = req.body;
    
    if (!ManufacturerName || !ModelName) {
      return res.status(400).json({
        success: false,
        message: 'ManufacturerName and ModelName are required',
      });
    }

    const newManufacturer = await VehicleManufacturer.create({
      ManufacturerName,
      ModelName,
      CreatedBy: CreatedBy || 1,
    });

    res.status(201).json({
      success: true,
      message: 'Manufacturer created successfully',
      data: newManufacturer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create manufacturer',
      error: err.message,
    });
  }
};

exports.updateManufacturer = async (req, res) => {
  try {
    const { id } = req.params;
    const { ManufacturerName, ModelName, UpdatedBy } = req.body;

    const updatedManufacturer = await VehicleManufacturer.update(id, {
      ManufacturerName,
      ModelName,
      UpdatedBy: UpdatedBy || 1,
    });

    if (!updatedManufacturer) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Manufacturer updated successfully',
      data: updatedManufacturer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update manufacturer',
      error: err.message,
    });
  }
};

exports.deleteManufacturer = async (req, res) => {
  try {
    const { id } = req.params;
    const { DeletedBy } = req.body;

    const deletedManufacturer = await VehicleManufacturer.delete(id, {
      DeletedBy: DeletedBy || 1,
    });

    if (!deletedManufacturer) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Manufacturer deleted successfully',
      data: deletedManufacturer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete manufacturer',
      error: err.message,
    });
  }
};
