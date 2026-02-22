// ============================================
// TEMPLATE: How to Update Other Controllers
// ============================================
// Copy this pattern to: customerController.js, vehicleController.js, itemController.js, etc.

const CustomerMaster = require('../models/CustomerMaster');

// READ PATTERN: Get all records for user's branch
exports.getAllCustomers = async (req, res) => {
  try {
    // Extract from middleware
    const userBranchId = req.user?.branchId;
    const userId = req.user?.userId;

    if (!userBranchId || !userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    // Fetch only records from user's branch
    const customers = await CustomerMaster.getAllByBranch(userBranchId);

    res.status(200).json({
      success: true,
      message: 'Customers retrieved for your branch',
      data: customers,
      branch: userBranchId,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message,
    });
  }
};

// READ BY ID PATTERN: Verify branch ownership
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranchId = req.user?.branchId;

    if (!userBranchId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const customer = await CustomerMaster.getById(id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // CRITICAL: Verify branch ownership
    if (customer.branchid !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this customer',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message,
    });
  }
};

// CREATE PATTERN: Force user's branch and track user
exports.createCustomer = async (req, res) => {
  try {
    const userBranchId = req.user?.branchId;
    const userId = req.user?.userId;

    if (!userBranchId || !userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const {
      FirstName,
      LastName,
      MobileNumber1,
      MobileNumber2,
      EmailAddress,
      Address,
    } = req.body;

    // CRITICAL: Force user's branch - NEVER use request value
    const customerData = {
      FirstName,
      LastName,
      MobileNumber1,
      MobileNumber2,
      EmailAddress,
      Address,
      BranchId: userBranchId,  // <-- FORCE from user context
      CreatedBy: userId,        // <-- TRACK who created it
    };

    const customer = await CustomerMaster.create(customerData);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
      createdBy: userId,
      branch: userBranchId,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message,
    });
  }
};

// UPDATE PATTERN: Verify branch, force branch, track user
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranchId = req.user?.branchId;
    const userId = req.user?.userId;

    if (!userBranchId || !userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    // CRITICAL: Verify ownership before update
    const customerCheck = await CustomerMaster.getById(id);
    if (!customerCheck || customerCheck.branchid !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to update this customer',
      });
    }

    const {
      FirstName,
      LastName,
      MobileNumber1,
      MobileNumber2,
      EmailAddress,
      Address,
    } = req.body;

    const customerData = {
      FirstName,
      LastName,
      MobileNumber1,
      MobileNumber2,
      EmailAddress,
      Address,
      BranchId: userBranchId,  // <-- FORCE (prevent branch change)
      UpdatedBy: userId,        // <-- TRACK who updated
    };

    const customer = await CustomerMaster.update(id, customerData);

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
      updatedBy: userId,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message,
    });
  }
};

// DELETE PATTERN: Verify branch, track user
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranchId = req.user?.branchId;
    const userId = req.user?.userId;

    if (!userBranchId || !userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    // CRITICAL: Verify ownership before delete
    const customerCheck = await CustomerMaster.getById(id);
    if (!customerCheck || customerCheck.branchid !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to delete this customer',
      });
    }

    const customer = await CustomerMaster.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: customer,
      deletedBy: userId,
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
