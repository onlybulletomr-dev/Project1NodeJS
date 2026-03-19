const InvoiceMaster = require('../models/InvoiceMaster');
const InvoiceDetail = require('../models/InvoiceDetail');
const ItemMaster = require('../models/ItemMaster');
const ServiceMaster = require('../models/ServiceMaster');

// Helper function to generate invoice number in format BBBYYMMMXXX
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
  
  // Build prefix for pattern matching
  const prefix = `${branchCode}${year}${month}`;
  const legacyPrefix = `INV${branchCode}${year}${month}`;
  
  // Find the maximum sequence number for this prefix (not just today)
  const maxSeqQuery = `
    SELECT MAX(CAST(RIGHT(invoicenumber, 3) AS INTEGER)) AS seq
    FROM invoicemaster 
    WHERE deletedat IS NULL
      AND (
        invoicenumber LIKE $1
        OR invoicenumber LIKE $2
      )
      AND RIGHT(invoicenumber, 3) ~ '^[0-9]{3}$'
  `;
  const maxSeqResult = await pool.query(maxSeqQuery, [prefix + '%', legacyPrefix + '%']);
  const maxSequence = maxSeqResult.rows.length > 0 ? maxSeqResult.rows[0].seq : 0;
  const sequenceNumber = (maxSequence + 1).toString().padStart(3, '0');
  
  const invoiceNumber = `${prefix}${sequenceNumber}`;
  console.log(`Generated invoice number: ${invoiceNumber} (BranchCode: ${branchCode}, Year: ${year}, Month: ${month}, Seq: ${sequenceNumber}, MaxSeq: ${maxSequence})`);
  return invoiceNumber;
}

exports.saveInvoice = async (req, res) => {
  try {
    console.log('=== INVOICE SAVE REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Get user ID from header
    const userId = req.headers['x-user-id'] || 1;
    console.log('User ID:', userId);

    // Get user's branch from database
    const pool = require('../config/db');
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchId = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;
    console.log('User Branch ID:', userBranchId);

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
    
    console.log('=== PROCESSING INVOICE DETAILS ===');
    console.log('InvoiceDetails array:', JSON.stringify(InvoiceDetails, null, 2));
    
    // Group details by item to handle multiple serials of the same item
    const groupedDetails = {};
    
    for (const detail of InvoiceDetails) {
      const itemKey = detail.ItemID || detail.ItemNumber;
      
      if (!groupedDetails[itemKey]) {
        groupedDetails[itemKey] = {
          detail: detail,
          serials: []
        };
      }
      
      if (detail.serialnumberid) {
        groupedDetails[itemKey].serials.push(detail.serialnumberid);
      }
    }
    
    console.log('Grouped details:', JSON.stringify(groupedDetails, null, 2));
    
    // Process each unique item once
    for (const itemKey in groupedDetails) {
      const { detail, serials } = groupedDetails[itemKey];
      
      console.log('\n--- Processing Grouped Item ---');
      console.log(`Item Key: ${itemKey}, Serial Count: ${serials.length}`);
      
      // Get itemid from itemmaster using partnumber for items, or use serviceid directly for services
      const partnumber = detail.ItemID || detail.ItemNumber;
      const itemSource = detail.source || 'item'; // Default to item if not specified
      let itemid = null;
      // IMPORTANT: Store snapshots from SCREEN VALUES, not from itemmaster
      let snapshotPartNumber = detail.PartNumber || partnumber; // Use screen value
      let snapshotItemName = detail.ItemName || ''; // Use screen value from form
      
      if (itemSource === 'service') {
        // For services, look up the serviceid from servicemaster using the service number
        const service = await ServiceMaster.getByServiceNumber(partnumber);
        if (service) {
          itemid = service.serviceid;
          console.log(`Looked up serviceid for service number ${partnumber}: ${itemid}`);
        } else {
          console.warn(`Service not found for service number: ${partnumber}`);
          throw new Error(`Service ${partnumber} not found in database`);
        }
      } else {
        // For items, look up in ItemMaster using partnumber to get itemid only
        if (partnumber) {
          const item = await ItemMaster.getByPartNumber(partnumber);
          if (item) {
            itemid = item.itemid;
            // DO NOT overwrite snapshots - keep screen values
            console.log(`Looked up itemid for partnumber ${partnumber}: ${itemid}`);
          } else {
            console.warn(`Item not found for partnumber: ${partnumber}`);
            itemid = String(partnumber);
            console.log(`Falling back to provided item identifier: ${itemid}`);
          }
        }
      }
      
      // For items with multiple serials, sum the quantities
      let totalQty = detail.Qty;
      let unitPrice = parseFloat(detail.UnitPrice);
      
      // If there are serials and source is item (serial-tracked), qty should match serial count
      if (serials.length > 0 && itemSource === 'item') {
        totalQty = serials.length;
        console.log(`Adjusted qty to match serial count: ${totalQty}`);
      }
      
      const invoiceDetailData = {
        InvoiceID: invoiceId,
        ItemID: itemid, // Use the actual itemid from itemmaster, or serviceid for services
        Qty: totalQty,
        UnitPrice: unitPrice,
        LineDiscount: parseFloat(detail.Discount || 0),
        LineTotal: unitPrice * totalQty - (parseFloat(detail.Discount || 0) * totalQty),
        LineItemTax1: 0,
        LineItemTax2: 0,
        CreatedBy: userId,  // Track who created it
        PartNumber: snapshotPartNumber, // Store snapshot of partnumber
        ItemName: snapshotItemName, // Store snapshot of itemname
      };
      
      console.log('Creating invoice detail with looked-up itemid:', invoiceDetailData);
      const invoiceDetail = await InvoiceDetail.create(invoiceDetailData);
      invoiceDetailRecords.push(invoiceDetail);

      // Link all serial numbers for this item to this single invoice detail
      if (serials.length > 0 && invoiceDetail.invoicedetailid) {
        console.log(`Linking ${serials.length} serial(s) to invoicedetailid ${invoiceDetail.invoicedetailid}`);
        
        for (const serialId of serials) {
          console.log(`  - Linking serial ${serialId}`);
          
          const updateSerialQuery = `
            UPDATE serialnumber
            SET invoicedetailid = $1, status = 'INVOICED', updatedat = CURRENT_TIMESTAMP
            WHERE serialnumberid = $2 AND status = 'SHELF'
          `;
          
          try {
            const updateResult = await pool.query(updateSerialQuery, [
              invoiceDetail.invoicedetailid,
              serialId
            ]);
            console.log(`    ✓ Serial ${serialId} linked successfully (rows affected: ${updateResult.rowCount})`);
          } catch (err) {
            console.error(`    Error linking serial ${serialId}:`, err.message);
            // Continue with invoice save even if serial linking fails
          }
        }
      }
    }

    console.log('=== INVOICE SAVE SUCCESS ===');
    console.log('Invoice ID:', invoiceMaster.invoiceid);
    console.log('Invoice Number:', invoiceMaster.invoicenumber);
    console.log('Branch ID:', invoiceMaster.branchid);
    console.log('Total Amount:', invoiceMaster.totalamount);
    console.log('Details recorded:', invoiceDetailRecords.length);

    res.status(201).json({
      success: true,
      message: 'Invoice saved successfully',
      data: {
        invoiceMaster,
        invoiceDetails: invoiceDetailRecords,
      },
    });
  } catch (err) {
    console.error('=== ERROR SAVING INVOICE ===');
    console.error('Error type:', err.constructor.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error detail:', err.detail);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to save invoice',
      error: err.message,
      errorCode: err.code,
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

    const pool = require('../config/db');
    
    // Get invoice with vehicle details and calculated amount paid
    const invoiceMasterResult = await pool.query(
      `SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.branchid,
        im.customerid,
        im.vehicleid,
        im.jobcardid,
        im.invoicedate,
        im.duedate,
        im.invoicetype,
        im.subtotal,
        im.totaldiscount,
        im.partsincome,
        im.serviceincome,
        im.tax1,
        im.tax2,
        im.totalamount,
        im.technicianmain,
        im.technicianassistant,
        im.waterwash,
        im.serviceadvisorin,
        im.serviceadvisordeliver,
        im.testdriver,
        im.cleaner,
        im.additionalwork,
        im.odometer,
        im.notes,
        im.notes1,
        im.extravar1,
        im.extravar2,
        im.extraint1,
        im.createdby,
        im.createdat,
        im.updatedby,
        im.updatedat,
        im.deletedat,
        im.deletedby,
        im.paymentstatus,
        im.paymentdate,
        im.vehiclenumber,
        COALESCE(vm.modelname, '-') as vehiclemodel,
        COALESCE(vm.color, '-') as vehiclecolor,
        COALESCE(SUM(CASE WHEN pd.paymentstatus IN ('Paid', 'Completed') THEN pd.amount ELSE 0 END), 0) as amountpaid
      FROM invoicemaster im
      LEFT JOIN vehiclemaster vm ON im.vehicleid = vm.vehicleid AND vm.deletedat IS NULL
      LEFT JOIN paymentdetail pd ON im.invoiceid = pd.invoiceid AND pd.deletedat IS NULL
      WHERE im.invoiceid = $1 AND im.deletedat IS NULL
      GROUP BY im.invoiceid, im.invoicenumber, im.branchid, im.customerid, im.vehicleid, im.jobcardid,
               im.invoicedate, im.duedate, im.invoicetype, im.subtotal, im.totaldiscount, im.partsincome,
               im.serviceincome, im.tax1, im.tax2, im.totalamount, im.technicianmain, im.technicianassistant,
               im.waterwash, im.serviceadvisorin, im.serviceadvisordeliver, im.testdriver, im.cleaner,
               im.additionalwork, im.odometer, im.notes, im.notes1, im.extravar1, im.extravar2, im.extraint1,
               im.createdby, im.createdat, im.updatedby, im.updatedat, im.deletedat, im.deletedby,
               im.paymentstatus, im.paymentdate, im.vehiclenumber,
               vm.modelname, vm.color`,
      [id]
    );

    if (invoiceMasterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const invoiceMaster = invoiceMasterResult.rows[0];

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
    const vehicleNumber = (req.query.vehicleNumber || '').trim();

    if (!userBranchId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    let invoices;
    let message;

    if (vehicleNumber) {
      invoices = await InvoiceMaster.getAllByVehicleNumberWithDetails(vehicleNumber);
      message = 'Invoices retrieved successfully for vehicle number across all branches';
    } else {
      invoices = await InvoiceMaster.getAllByBranchWithDetails(userBranchId);
      message = 'Invoices retrieved successfully for your branch';
    }

    res.status(200).json({
      success: true,
      message,
      data: invoices,
      branch: userBranchId,
      vehicleNumber: vehicleNumber || null,
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

    // Verify invoice belongs to user's branch
    const invoiceMasterCheck = await InvoiceMaster.getById(id);
    console.log('=== UPDATE INVOICE DEBUG ===');
    console.log('Invoice ID to update:', id);
    console.log('Fetched invoice record:', JSON.stringify(invoiceMasterCheck, null, 2));
    
    if (!invoiceMasterCheck) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found in database',
      });
    }

    if (invoiceMasterCheck.branchid !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to update this invoice',
      });
    }

    // Preserve existing invoice number (getById returns lowercase column names from PostgreSQL)
    const existingInvoiceNumber = invoiceMasterCheck.invoicenumber;
    console.log('Existing invoice number from DB:', existingInvoiceNumber);
    
    if (!existingInvoiceNumber) {
      console.error('Invoice record exists but invoicenumber is null/undefined:', invoiceMasterCheck);
      return res.status(400).json({
        success: false,
        message: `Invoice ${id} corrupted: missing invoicenumber in database`,
      });
    }

    const invoiceMasterData = {
      InvoiceNumber: existingInvoiceNumber,
      BranchId: userBranchId,
      CustomerId: CustomerId || invoiceMasterCheck.customerid,
      VehicleId: VehicleId || invoiceMasterCheck.vehicleid,
      VehicleNumber: VehicleNumber || invoiceMasterCheck.vehiclenumber,
      JobCardId: JobCardId || 0,
      InvoiceDate: invoiceMasterCheck.invoicedate || new Date().toISOString().split('T')[0],
      DueDate: invoiceMasterCheck.duedate,
      InvoiceType: invoiceMasterCheck.invoicetype || 'Service Invoice',
      SubTotal: parseFloat(SubTotal || 0),
      TotalDiscount: parseFloat(TotalDiscount || 0),
      PartsIncome: parseFloat(PartsIncome || 0),
      ServiceIncome: parseFloat(ServiceIncome || 0),
      Tax1: parseFloat(Tax1 || 0),
      Tax2: parseFloat(Tax2 || 0),
      TotalAmount: parseFloat(TotalAmount || 0),
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
      UpdatedBy: userId,
    };

    console.log('=== ABOUT TO CALL MODEL UPDATE ===');
    console.log('Invoice ID:', id);
    console.log('InvoiceNumber value to pass:', invoiceMasterData.InvoiceNumber);
    console.log('InvoiceNumber is null?', invoiceMasterData.InvoiceNumber === null);
    console.log('InvoiceNumber is undefined?', invoiceMasterData.InvoiceNumber === undefined);
    console.log('InvoiceNumber type:', typeof invoiceMasterData.InvoiceNumber);
    console.log('Full data object keys:', Object.keys(invoiceMasterData));

    const invoiceMaster = await InvoiceMaster.update(id, invoiceMasterData);

    if (!invoiceMaster) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Delete existing details and create new ones
    if (InvoiceDetails && Array.isArray(InvoiceDetails)) {
      console.log('=== DELETING OLD INVOICE DETAILS ===');
      console.log('Invoice ID:', id);
      console.log('User ID:', userId);
      // For updates, HARD DELETE old detail rows to avoid unique constraint violations
      // (soft-deleted rows would still conflict with new inserts having same itemid)
      const deletedRows = await InvoiceDetail.hardDeleteByInvoiceId(id);
      console.log('Rows hard-deleted:', deletedRows ? deletedRows.length : 0);

      const invoiceDetailRecords = [];
      for (const detail of InvoiceDetails) {
        const partnumber = detail.ItemID || detail.ItemNumber;
        const itemSource = detail.source || 'item';
        let itemid = null;

        if (itemSource === 'service') {
          // For services, look up the serviceid from servicemaster using the service number
          const service = await ServiceMaster.getByServiceNumber(partnumber);
          if (service) {
            itemid = service.serviceid;
            console.log(`Looked up serviceid for service number ${partnumber}: ${itemid}`);
          } else {
            console.warn(`Service not found for service number: ${partnumber}`);
            throw new Error(`Service ${partnumber} not found in database`);
          }
        } else if (partnumber) {
          const item = await ItemMaster.getByPartNumber(partnumber);
          if (item) {
            itemid = item.itemid;
          } else {
            itemid = String(partnumber);
          }
        }

        const invoiceDetailData = {
          InvoiceID: id,
          ItemID: itemid,
          Qty: parseInt(detail.Qty || 0, 10),
          UnitPrice: parseFloat(detail.UnitPrice || 0),
          LineDiscount: parseFloat(detail.Discount || 0),
          LineTotal: parseFloat(detail.Total || 0),
          LineItemTax1: 0,
          LineItemTax2: 0,
          CreatedBy: userId,
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
