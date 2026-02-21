const InvoiceMaster = require('../models/InvoiceMaster');
const InvoiceDetail = require('../models/InvoiceDetail');
const ItemMaster = require('../models/ItemMaster');

exports.saveInvoice = async (req, res) => {
  try {
    console.log('Invoice save request received:', req.body);
    
    const {
      InvoiceNumber,
      BranchId,
      CustomerId,
      VehicleId,
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
      CreatedBy,
    } = req.body;

    // Validate required fields
    if (!InvoiceNumber || !CustomerId || !VehicleId || InvoiceDetails === undefined || !Array.isArray(InvoiceDetails) || InvoiceDetails.length === 0) {
      console.warn('Validation failed:', { InvoiceNumber, CustomerId, VehicleId, JobCardId });
      return res.status(400).json({
        success: false,
        message: 'InvoiceNumber, CustomerId, VehicleId, and InvoiceDetails are required',
      });
    }

    // Create invoice master record
    const invoiceMasterData = {
      InvoiceNumber,
      BranchId: BranchId || 1,
      CustomerId,
      VehicleId,
      JobCardId,
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
      CreatedBy: CreatedBy || 1,
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
      // Get itemid from itemmaster using partnumber (ItemID or ItemNumber from frontend contains partnumber)
      const partnumber = detail.ItemID || detail.ItemNumber;
      let itemid = null;
      
      if (partnumber) {
        const item = await ItemMaster.getByPartNumber(partnumber);
        if (item) {
          itemid = item.itemid;
          console.log(`Looked up itemid for partnumber ${partnumber}: ${itemid}`);
        } else {
          console.warn(`Item not found for partnumber: ${partnumber}`);
        }
      }
      
      const invoiceDetailData = {
        InvoiceID: invoiceId,
        ItemID: itemid, // Use the actual itemid from itemmaster, not the partnumber
        Qty: parseInt(detail.Qty),
        UnitPrice: parseFloat(detail.UnitPrice),
        LineDiscount: parseFloat(detail.Discount || 0),
        LineTotal: parseFloat(detail.Total),
        LineItemTax1: 0,
        LineItemTax2: 0,
        CreatedBy: CreatedBy || 1,
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

    const invoiceMaster = await InvoiceMaster.getById(id);
    if (!invoiceMaster) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
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
    const invoices = await InvoiceMaster.getAll();

    res.status(200).json({
      success: true,
      message: 'All invoices retrieved successfully',
      data: invoices,
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
      UpdatedBy,
    } = req.body;

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
      UpdatedBy,
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
      await InvoiceDetail.deleteByInvoiceId(id, UpdatedBy);

      const invoiceDetailRecords = [];
      for (const detail of InvoiceDetails) {
        const invoiceDetailData = {
          InvoiceID: id,
          ItemID: detail.ItemID || detail.ItemNumber,
          Qty: detail.Qty,
          UnitPrice: detail.UnitPrice,
          LineDiscount: detail.Discount || 0,
          Total: detail.Total,
          CreatedBy: UpdatedBy,
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
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoiceMaster,
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
