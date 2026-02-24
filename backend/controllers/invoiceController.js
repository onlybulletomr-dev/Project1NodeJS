const InvoiceMaster = require('../models/InvoiceMaster');
const InvoiceDetail = require('../models/InvoiceDetail');
const ItemMaster = require('../models/ItemMaster');

// Helper function to generate invoice number in format INVBBBYYMMMXXX
async function generateInvoiceNumber(pool, branchId) {
  // Get branch code from CompanyMaster (branchId is CompanyID)
  const branchQuery = `
    SELECT ExtraVar1 
    FROM CompanyMaster 
    WHERE CompanyID = $1 AND DeletedAt IS NULL
  `;
  const branchResult = await pool.query(branchQuery, [branchId]);
  let branchCode = branchResult.rows.length > 0 && branchResult.rows[0].extravar1 
    ? branchResult.rows[0].extravar1 
    : String(branchId).padStart(3, '0');
  
  // Ensure branchCode is max 3 characters
  branchCode = branchCode.substring(0, 3).padStart(3, '0');
  
  // Get current date components
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[now.getMonth()];
  
  // Get today's date in YYYY-MM-DD format
  const today = now.toISOString().split('T')[0];
  
  // Count invoices created today for this branch to get sequence number
  const countQuery = `
    SELECT COUNT(*) as count FROM invoicemaster 
    WHERE branchid = $1 AND DATE(createdat) = $2 AND deletedat IS NULL
  `;
  const countResult = await pool.query(countQuery, [branchId, today]);
  const sequenceNumber = (countResult.rows[0].count + 1).toString().padStart(3, '0');
  
  const invoiceNumber = `INV${branchCode}${year}${month}${sequenceNumber}`;
  console.log(`Generated invoice number: ${invoiceNumber} (BranchCode: ${branchCode}, Year: ${year}, Month: ${month}, Seq: ${sequenceNumber})`);
  return invoiceNumber;
}

exports.saveInvoice = async (req, res) => {
  try {
    console.log('Invoice save request received:', req.body);
    
    // Get user ID from header
    const userId = req.headers['x-user-id'] || 1;

    // Get user's branch from database
    const pool = require('../config/db');
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchId = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    if (!userBranchId || !userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }
    
    const {
      BranchId,
      CustomerId,
      VehicleId,
      VehicleNumber,
      JobCardId,
      SubTotal,
      TotalDiscount,
      PartsIncome,
      ServiceIncome,
      Tax1,
      Tax2,
      TotalAmount,
      Technicianmain,
      Technicianassistant,
      WaterWash,
      ServiceAdvisorIn,
      ServiceAdvisorDeliver,
      TestDriver,
      Cleaner,
      AdditionalWork,
      Odometer,
      Notes,
      Notes1,
      InvoiceDetails,
    } = req.body;

    // Validate required fields
    if (!CustomerId || !VehicleId || InvoiceDetails === undefined || !Array.isArray(InvoiceDetails) || InvoiceDetails.length === 0) {
      console.warn('Validation failed:', { CustomerId, VehicleId, JobCardId });
      return res.status(400).json({
        success: false,
        message: 'CustomerId, VehicleId, and InvoiceDetails are required',
      });
    }

    // Generate invoice number automatically
    const InvoiceNumber = await generateInvoiceNumber(pool, userBranchId);
    console.log('Generated invoice number:', InvoiceNumber);

    // Create invoice master record - FORCE user's branch, use userId as CreatedBy
    const invoiceMasterData = {
      InvoiceNumber,
      BranchId: userBranchId,  // FORCE user's branch - cannot be overridden
      CustomerId,
      VehicleId,
      VehicleNumber,
      JobCardId: JobCardId || 0,
      InvoiceType: 'Service Invoice',
      SubTotal: parseFloat(SubTotal),
      TotalDiscount: parseFloat(TotalDiscount || 0),
      PartsIncome: parseFloat(PartsIncome || 0),
      ServiceIncome: parseFloat(ServiceIncome || 0),
      Tax1: parseFloat(Tax1 || 0),
      Tax2: parseFloat(Tax2 || 0),
      TotalAmount: parseFloat(TotalAmount),
      Technicianmain: Technicianmain || null,
      Technicianassistant: Technicianassistant || null,
      WaterWash: WaterWash || null,
      ServiceAdvisorIn: ServiceAdvisorIn || null,
      ServiceAdvisorDeliver: ServiceAdvisorDeliver || null,
      TestDriver: TestDriver || null,
      Cleaner: Cleaner || null,
      AdditionalWork: AdditionalWork || null,
      Odometer: Odometer || null,
      Notes: Notes || null,
      Notes1: Notes1 || null,
      CreatedBy: userId,  // Track who created it
    };

    console.log('Creating invoice master with data:', invoiceMasterData);
    const invoiceMaster = await InvoiceMaster.create(invoiceMasterData);
    console.log('Invoice master created:', invoiceMaster);
    console.log('InvoiceMaster keys:', Object.keys(invoiceMaster));
    console.log('InvoiceMaster invoiceid:', invoiceMaster.invoiceid);

    // Create invoice detail records
    const invoiceDetailRecords = [];
    const invoiceId = invoiceMaster.invoiceid;
    
    console.log('Using invoiceId for detail insert:', invoiceId);
    
    if (!invoiceId) {
      throw new Error('Failed to get invoiceid from created record: ' + JSON.stringify(invoiceMaster));
    }
    
    for (const detail of InvoiceDetails) {
      // Get itemid from itemmaster using partnumber for items, or use serviceid directly for services
      const partnumber = detail.ItemID || detail.ItemNumber;
      const itemSource = detail.source || 'item'; // Default to item if not specified
      let itemid = null;
      
      if (itemSource === 'service') {
        // For services, use the serviceid directly as itemid (it's VARCHAR so can store any string)
        itemid = String(partnumber);
        console.log(`Using service ID directly: ${itemid}`);
      } else {
        // For items, look up in ItemMaster using partnumber
        if (partnumber) {
          const item = await ItemMaster.getByPartNumber(partnumber);
          if (item) {
            itemid = item.itemid;
            console.log(`Looked up itemid for partnumber ${partnumber}: ${itemid}`);
          } else {
            console.warn(`Item not found for partnumber: ${partnumber}`);
          }
        }
      }
      
      const invoiceDetailData = {
        InvoiceID: invoiceId,
        ItemID: itemid, // Use the actual itemid from itemmaster, or serviceid for services
        Qty: parseInt(detail.Qty),
        UnitPrice: parseFloat(detail.UnitPrice),
        LineDiscount: parseFloat(detail.Discount || 0),
        LineTotal: parseFloat(detail.Total),
        LineItemTax1: 0,
        LineItemTax2: 0,
        CreatedBy: userId,  // Track who created it
      };
      
      console.log('Creating invoice detail with looked-up itemid:', invoiceDetailData);
      const invoiceDetail = await InvoiceDetail.create(invoiceDetailData);
      invoiceDetailRecords.push(invoiceDetail);
    }

    res.status(201).json({
      success: true,
      message: 'Invoice saved successfully',
      data: {
        invoiceMaster,
        invoiceDetails: invoiceDetailRecords,
      },
    });
  } catch (err) {
    console.error('Error saving invoice:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to save invoice',
      error: err.message,
    });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranchId = req.user?.branchId;

    if (!userBranchId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const invoiceMaster = await InvoiceMaster.getById(id);
    if (!invoiceMaster) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Verify invoice belongs to user's branch
    if (invoiceMaster.branchid !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this invoice',
      });
    }

    const invoiceDetails = await InvoiceDetail.getByInvoiceId(id);

    res.status(200).json({
      success: true,
      message: 'Invoice retrieved successfully',
      data: {
        invoiceMaster,
        invoiceDetails,
      },
    });
  } catch (err) {
    console.error('Error retrieving invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice',
      error: err.message,
    });
  }
};

exports.getAllInvoices = async (req, res) => {
  try {
    // Get user's branch from middleware
    const userBranchId = req.user?.branchId;

    if (!userBranchId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    // Fetch invoices with customer and vehicle details
    const invoices = await InvoiceMaster.getAllByBranchWithDetails(userBranchId);

    res.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully for your branch',
      data: invoices,
      branch: userBranchId,
    });
  } catch (err) {
    console.error('Error retrieving invoices:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoices',
      error: err.message,
    });
  }
};

exports.updateInvoice = async (req, res) => {
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

    const {
      VehicleNumber,
      VehicleModel,
      VehicleColor,
      CustomerID,
      MobileNumber1,
      JobCardID,
      Notes,
      TechnicianMain,
      TechnicianAssistant,
      ServiceAdvisorIn,
      ServiceAdvisorDeliver,
      TestDriver,
      Cleaner,
      WaterWash,
      Odometer,
      TotalDiscount,
      InvoiceDetails,
    } = req.body;

    // Verify invoice belongs to user's branch
    const invoiceMasterCheck = await InvoiceMaster.getById(id);
    if (!invoiceMasterCheck || invoiceMasterCheck.branchid !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to update this invoice',
      });
    }

    const invoiceMasterData = {
      VehicleNumber,
      VehicleModel,
      VehicleColor,
      CustomerID,
      MobileNumber1,
      JobCardID,
      Notes,
      TechnicianMain: TechnicianMain || null,
      TechnicianAssistant: TechnicianAssistant || null,
      ServiceAdvisorIn: ServiceAdvisorIn || null,
      ServiceAdvisorDeliver: ServiceAdvisorDeliver || null,
      TestDriver: TestDriver || null,
      Cleaner: Cleaner || null,
      WaterWash: WaterWash || null,
      Odometer,
      TotalDiscount: TotalDiscount || 0,
      UpdatedBy: userId,  // Track who updated it
    };

    const invoiceMaster = await InvoiceMaster.update(id, invoiceMasterData);

    if (!invoiceMaster) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Delete existing details and create new ones
    if (InvoiceDetails && Array.isArray(InvoiceDetails)) {
      await InvoiceDetail.deleteByInvoiceId(id, userId);

      const invoiceDetailRecords = [];
      for (const detail of InvoiceDetails) {
        const invoiceDetailData = {
          InvoiceID: id,
          ItemID: detail.ItemID || detail.ItemNumber,
          Qty: detail.Qty,
          UnitPrice: detail.UnitPrice,
          LineDiscount: detail.Discount || 0,
          Total: detail.Total,
          CreatedBy: userId,  // Track who created it
        };

        const invoiceDetail = await InvoiceDetail.create(invoiceDetailData);
        invoiceDetailRecords.push(invoiceDetail);
      }

      return res.status(200).json({
        success: true,
        message: 'Invoice updated successfully',
        data: {
          invoiceMaster,
          invoiceDetails: invoiceDetailRecords,
        },
        updatedBy: userId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoiceMaster,
      updatedBy: userId,
    });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: err.message,
    });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { DeletedBy } = req.body;

    if (!DeletedBy) {
      return res.status(400).json({
        success: false,
        message: 'DeletedBy is required',
      });
    }

    await InvoiceDetail.deleteByInvoiceId(id, DeletedBy);
    const invoiceMaster = await InvoiceMaster.delete(id, DeletedBy);

    if (!invoiceMaster) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      data: invoiceMaster,
    });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: err.message,
    });
  }
};
