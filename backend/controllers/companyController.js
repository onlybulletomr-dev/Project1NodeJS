const CompanyMaster = require('../models/CompanyMaster');

// Create company
exports.createCompany = async (req, res) => {
  try {
    const company = await CompanyMaster.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating company',
      error: error.message,
    });
  }
};

// Get all companies
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await CompanyMaster.findAll();
    console.log(`Returning ${companies.length} companies to client`);
    res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error('Error in getAllCompanies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message,
    });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await CompanyMaster.findById(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }
    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching company',
      error: error.message,
    });
  }
};

// Update company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await CompanyMaster.update(id, req.body);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating company',
      error: error.message,
    });
  }
};

// Delete company (soft delete)
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { DeletedBy, DeletedAt } = req.body;
    const company = await CompanyMaster.delete(id, DeletedBy, DeletedAt);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting company',
      error: error.message,
    });
  }
};

// Get company config for printing
exports.getCompanyConfig = async (req, res) => {
  try {
    const { branchId } = req.params;
    const pool = require('../config/db');

    const result = await pool.query(
      `SELECT 
        companyid,
        companyname,
        addressline1,
        addressline2,
        city,
        state,
        postalcode,
        country,
        phonenumber1,
        phonenumber2,
        emailaddress,
        bankname,
        bankaccountnumber,
        bankswiftcode,
        logoimagepath
       FROM companymaster 
       WHERE companyid = $1 AND deletedat IS NULL`,
      [branchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company config not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching company config',
      error: error.message,
    });
  }
};
