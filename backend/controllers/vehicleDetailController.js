const VehicleDetail = require('../models/VehicleDetail');

exports.createVehicleDetail = async (req, res) => {
  try {
    console.log('[VehicleDetail] Received request body:', JSON.stringify(req.body, null, 2));
    
    const { CustomerID, RegistrationNumber, VehicleModel, Color, CreatedBy } = req.body;
    
    console.log('[VehicleDetail] Destructured values:');
    console.log('  CustomerID:', CustomerID);
    console.log('  RegistrationNumber:', RegistrationNumber);
    console.log('  VehicleModel:', VehicleModel);
    console.log('  Color:', Color);
    console.log('  CreatedBy:', CreatedBy);
    
    if (!CustomerID || !RegistrationNumber || !VehicleModel || !Color) {
      console.log('[VehicleDetail] Validation failed - required fields missing');
      return res.status(400).json({
        success: false,
        message: 'CustomerID, RegistrationNumber, VehicleModel, and Color are required',
      });
    }

    const dataToInsert = {
      CustomerID,
      RegistrationNumber,
      VehicleModel,
      Color,
      CreatedBy: CreatedBy || 1,
    };
    
    console.log('[VehicleDetail] Inserting data:', JSON.stringify(dataToInsert, null, 2));
    
    const newVehicleDetail = await VehicleDetail.create(dataToInsert);
    
    console.log('[VehicleDetail] Insert successful:', JSON.stringify(newVehicleDetail, null, 2));

    res.status(201).json({
      success: true,
      message: 'Vehicle detail created successfully',
      data: newVehicleDetail,
    });
  } catch (err) {
    console.error('[VehicleDetail] Error creating vehicle detail:', err.message);
    console.error('[VehicleDetail] Full error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle detail',
      error: err.message,
    });
  }
};

exports.getAllVehicleDetails = async (req, res) => {
  try {
    console.log('[DEBUG] getAllVehicleDetails called');
    const vehicleDetails = await VehicleDetail.getAll();
    console.log(`[DEBUG] Found ${vehicleDetails.length} total vehicles in database`);
    res.status(200).json({
      success: true,
      message: 'All vehicle details retrieved successfully',
      data: vehicleDetails,
    });
  } catch (err) {
    console.error('[ERROR] Failed to retrieve vehicle details:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle details',
      error: err.message,
    });
  }
};

exports.getVehicleDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicleDetails = await VehicleDetail.getById(id);
    if (!vehicleDetails || vehicleDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle details not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Vehicle details retrieved successfully',
      data: vehicleDetails,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle details',
      error: err.message,
    });
  }
};

exports.getVehicleDetailsByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log(`[DEBUG] getVehicleDetailsByCustomerId called for customerId: ${customerId}`);
    
    const vehicleDetails = await VehicleDetail.getByCustomerId(customerId);
    console.log(`[DEBUG] Found ${vehicleDetails.length} vehicles for customer ${customerId}:`, vehicleDetails);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle details retrieved successfully',
      data: vehicleDetails,
    });
  } catch (err) {
    console.error(`[ERROR] Failed to retrieve vehicle details for customer ${req.params.customerId}:`, err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle details',
      error: err.message,
    });
  }
};

exports.updateVehicleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedVehicleDetail = await VehicleDetail.update(id, req.body);

    if (!updatedVehicleDetail) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle detail not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle detail updated successfully',
      data: updatedVehicleDetail,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle detail',
      error: err.message,
    });
  }
};

exports.deleteVehicleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { DeletedBy } = req.body;

    const deletedVehicleDetail = await VehicleDetail.delete(id, DeletedBy || 1);

    if (!deletedVehicleDetail) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle detail not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle detail deleted successfully',
      data: deletedVehicleDetail,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle detail',
      error: err.message,
    });
  }
};
