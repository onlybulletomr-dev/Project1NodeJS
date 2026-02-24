const CustomerMaster = require('../models/CustomerMaster');
const VehicleDetail = require('../models/VehicleDetail');

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    console.log('[CustomerController] Creating customer with data:', JSON.stringify(req.body, null, 2));
    const customerData = { ...req.body };
    
    // Extract vehicle data from the request (if present)
    const vehicleData = customerData.vehicles ? customerData.vehicles[0] : null;
    
    // Remove vehicle-related fields from customer data before creating CustomerMaster
    delete customerData.vehicles;
    delete customerData.vehiclenumber;
    delete customerData.vehiclemodel;
    delete customerData.vehiclecolor;
    
    const customer = await CustomerMaster.create(customerData);
    console.log('[CustomerController] Customer created successfully:', customer);
    
    // Handle vehicle creation if vehicle data exists
    if (vehicleData) {
      try {
        const vehicleCreateData = {
          CustomerID: customer.customerid || customer.CustomerID,
          RegistrationNumber: vehicleData.vehiclenumber,
          VehicleModel: vehicleData.vehiclemodel,
          Color: vehicleData.vehiclecolor,
          CreatedBy: customerData.CreatedBy || customerData.createdby || 1,
        };
        await VehicleDetail.create(vehicleCreateData);
      } catch (vehicleError) {
        console.error('[CustomerController] Error creating vehicle:', vehicleError.message);
        // Don't fail the entire request if vehicle creation fails, just log it
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    console.error('[CustomerController] Error creating customer:', error.message);
    console.error('[CustomerController] Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message,
    });
  }
};

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await CustomerMaster.findAll();
    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message,
    });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await CustomerMaster.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message,
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = { ...req.body };
    
    // Extract vehicle data from the request (if present)
    const vehicleData = customerData.vehicles ? customerData.vehicles[0] : null;
    
    // Remove vehicle-related fields from customer data before updating CustomerMaster
    delete customerData.vehicles;
    delete customerData.vehiclenumber;
    delete customerData.vehiclemodel;
    delete customerData.vehiclecolor;
    
    // Update customer record
    const customer = await CustomerMaster.update(id, customerData);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    
    // Handle vehicle update if vehicle data exists
    if (vehicleData && vehicleData.vehicledetailid) {
      try {
        const vehicleUpdateData = {
          RegistrationNumber: vehicleData.vehiclenumber,
          VehicleModel: vehicleData.vehiclemodel,
          Color: vehicleData.vehiclecolor,
          UpdatedBy: customerData.UpdatedBy || 1,
        };
        await VehicleDetail.update(vehicleData.vehicledetailid, vehicleUpdateData);
      } catch (vehicleError) {
        console.error('[CustomerController] Error updating vehicle:', vehicleError.message);
        // Don't fail the entire request if vehicle update fails, just log it
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message,
    });
  }
};

// Delete customer (soft delete)
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { DeletedBy, DeletedAt } = req.body;
    const customer = await CustomerMaster.delete(id, DeletedBy, DeletedAt);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message,
    });
  }
};

// Get customers by branch
exports.getCustomersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const customers = await CustomerMaster.findByBranchId(branchId);
    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customers by branch',
      error: error.message,
    });
  }
};
