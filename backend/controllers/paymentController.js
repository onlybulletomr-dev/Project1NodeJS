const pool = require('../config/db');
const PaymentMethodMaster = require('../models/PaymentMethodMaster');

// Get all unpaid invoices
exports.getUnpaidInvoices = async (req, res) => {
  try {
    const query = `
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        cm.firstname || ' ' || cm.lastname AS customername,
        cm.mobilenumber1 AS phonenumber,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat,
        im.customerid,
        im.vehicleid
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid
      WHERE COALESCE(im.paymentstatus, 'Unpaid') = 'Unpaid'
      AND im.deletedat IS NULL
      ORDER BY im.createdat DESC
    `;
    
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Unpaid invoices retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unpaid invoices',
      error: error.message
    });
  }
};

// Get unpaid invoices for a specific vehicle
exports.getUnpaidInvoicesByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required'
      });
    }

    // First get vehicle details from vehicledetails table
    const vehicleQuery = `
      SELECT 
        vd.vehiclemasterid as vehicleid, 
        vd.registrationnumber, 
        vm.modelname, 
        vm.manufacturername, 
        vd.color
      FROM vehicledetails vd
      LEFT JOIN vehiclemaster vm ON vd.vehiclemasterid = vm.vehicleid
      WHERE vd.vehiclemasterid = $1 AND vd.deletedat IS NULL
    `;
    const vehicleResult = await pool.query(vehicleQuery, [vehicleId]);
    const vehicleData = vehicleResult.rows[0];

    // Then get all unpaid invoices for this vehicle
    const invoicesQuery = `
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        cm.firstname || ' ' || cm.lastname AS customername,
        cm.mobilenumber1 AS phonenumber,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat,
        im.customerid,
        im.vehicleid
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid
      WHERE im.vehicleid = $1
      AND COALESCE(im.paymentstatus, 'Unpaid') = 'Unpaid'
      AND im.deletedat IS NULL
      ORDER BY im.createdat DESC
    `;
    const invoicesResult = await pool.query(invoicesQuery, [vehicleId]);

    res.status(200).json({
      success: true,
      data: {
        vehicle: vehicleData,
        invoices: invoicesResult.rows
      },
      message: 'Unpaid invoices for vehicle retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching unpaid invoices by vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unpaid invoices by vehicle',
      error: error.message
    });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { InvoiceID } = req.params;
    const { PaymentStatus, PaymentDate } = req.body;

    if (!InvoiceID || !PaymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'InvoiceID and PaymentStatus are required'
      });
    }

    // Valid payment statuses
    const validStatuses = ['Paid', 'Unpaid', 'Partial'];
    if (!validStatuses.includes(PaymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PaymentStatus. Must be: Paid, Unpaid, or Partial'
      });
    }

    const paymentDateValue = PaymentStatus === 'Paid' ? (PaymentDate || new Date().toISOString().split('T')[0]) : null;
    const updatedAt = new Date().toISOString().split('T')[0];

    const query = `
      UPDATE InvoiceMaster 
      SET PaymentStatus = $1, 
          PaymentDate = $2,
          UpdatedAt = $3,
          UpdatedBy = $4
      WHERE InvoiceID = $5 AND DeletedAt IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [PaymentStatus, paymentDateValue, updatedAt, 1, InvoiceID]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Get payment summary/statistics
exports.getPaymentSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(CASE WHEN paymentstatus = 'Paid' THEN 1 END) AS paidcount,
        COUNT(CASE WHEN paymentstatus = 'Unpaid' THEN 1 END) AS unpaidcount,
        COUNT(CASE WHEN paymentstatus = 'Partial' THEN 1 END) AS partialcount,
        COALESCE(SUM(CASE WHEN paymentstatus = 'Paid' THEN totalamount ELSE 0 END), 0) AS paidamount,
        COALESCE(SUM(CASE WHEN paymentstatus = 'Unpaid' THEN totalamount ELSE 0 END), 0) AS unpaidamount,
        COALESCE(SUM(CASE WHEN paymentstatus = 'Partial' THEN totalamount ELSE 0 END), 0) AS partialamount,
        COALESCE(SUM(totalamount), 0) AS totalamount
      FROM invoicemaster
      WHERE deletedat IS NULL
    `;

    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Payment summary retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment summary',
      error: error.message
    });
  }
};

// Get all payment methods
exports.getAllPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethodMaster.getAll();
    res.status(200).json({
      success: true,
      data: paymentMethods,
      message: 'Payment methods retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
};

// Get active payment methods
exports.getActivePaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethodMaster.getActive();
    res.status(200).json({
      success: true,
      data: paymentMethods,
      message: 'Active payment methods retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching active payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active payment methods',
      error: error.message
    });
  }
};

// Get payment method by ID
exports.getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentMethod = await PaymentMethodMaster.getById(id);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    res.status(200).json({
      success: true,
      data: paymentMethod,
      message: 'Payment method retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment method',
      error: error.message
    });
  }
};
