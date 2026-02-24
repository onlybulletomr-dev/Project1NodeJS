const pool = require('../config/db');
const PaymentMethodMaster = require('../models/PaymentMethodMaster');
const PaymentDetail = require('../models/PaymentDetail');

// Get all unpaid and partially paid invoices
exports.getUnpaidInvoices = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 1;

    // Get user's branch first
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    const query = `
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') as customername,
        cm.mobilenumber1 AS phonenumber,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat,
        im.customerid,
        im.vehicleid,
        COALESCE(SUM(CASE WHEN pd.paymentstatus IN ('Paid', 'Completed') THEN pd.amount ELSE 0 END), 0) AS amountpaid,
        COALESCE(im.totalamount, 0) - COALESCE(SUM(CASE WHEN pd.paymentstatus IN ('Paid', 'Completed') THEN pd.amount ELSE 0 END), 0) AS amounttobepaid
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      LEFT JOIN paymentdetail pd ON im.invoiceid = pd.invoiceid AND pd.deletedat IS NULL
      WHERE im.deletedat IS NULL 
        AND COALESCE(im.paymentstatus, 'Unpaid') IN ('Unpaid', 'Partial')
        AND im.branchid = $1
      GROUP BY im.invoiceid, im.invoicenumber, im.vehiclenumber, cm.firstname, cm.lastname, cm.mobilenumber1, im.totalamount, im.paymentstatus, im.createdat, im.customerid, im.vehicleid
      ORDER BY im.createdat DESC
    `;
    
    const result = await pool.query(query, [userBranchID]);
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

// Get unpaid and partially paid invoices for a specific vehicle
exports.getUnpaidInvoicesByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.headers['x-user-id'] || 1;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required'
      });
    }

    console.log('[PAYMENT API] Fetching invoices for vehicleId:', vehicleId);

    // Get user's branch first
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    // First get vehicle details from vehicledetail table
    const vehicleQuery = `
      SELECT 
        vd.vehicledetailid as vehicleid, 
        vd.vehiclenumber, 
        vd.vehiclemodel, 
        vd.vehiclecolor,
        TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')) as customername,
        cm.mobilenumber1
      FROM vehicledetail vd
      LEFT JOIN customermaster cm ON vd.customerid = cm.customerid AND cm.deletedat IS NULL
      WHERE vd.vehicledetailid = $1 AND vd.deletedat IS NULL
    `;
    const vehicleResult = await pool.query(vehicleQuery, [vehicleId]);
    const vehicleData = vehicleResult.rows[0];
    
    console.log('[PAYMENT API] Vehicle Data from query:', vehicleData);

    // Then get all unpaid and partially paid invoices for this vehicle
    const invoicesQuery = `
      SELECT 
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') as customername,
        cm.mobilenumber1 AS phonenumber,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat,
        im.customerid,
        im.vehicleid,
        COALESCE(SUM(CASE WHEN pd.paymentstatus IN ('Paid', 'Completed') THEN pd.amount ELSE 0 END), 0) AS amountpaid,
        COALESCE(im.totalamount, 0) - COALESCE(SUM(CASE WHEN pd.paymentstatus IN ('Paid', 'Completed') THEN pd.amount ELSE 0 END), 0) AS amounttobepaid
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      LEFT JOIN paymentdetail pd ON im.invoiceid = pd.invoiceid AND pd.deletedat IS NULL
      WHERE im.vehicleid = $1
      AND im.deletedat IS NULL
      AND COALESCE(im.paymentstatus, 'Unpaid') IN ('Unpaid', 'Partial')
      AND im.branchid = $2
      GROUP BY im.invoiceid, im.invoicenumber, im.vehiclenumber, cm.firstname, cm.lastname, cm.mobilenumber1, im.totalamount, im.paymentstatus, im.createdat, im.customerid, im.vehicleid
      ORDER BY im.createdat DESC
    `;
    const invoicesResult = await pool.query(invoicesQuery, [vehicleId, userBranchID]);
    
    console.log('[PAYMENT API] Invoices found:', invoicesResult.rows.length);
    console.log('[PAYMENT API] Response sending - Vehicle data exists:', !!vehicleData);

    res.status(200).json({
      success: true,
      data: {
        vehicle: vehicleData || { vehiclenumber: 'N/A' },
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

// Update payment status for a single invoice
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { InvoiceID } = req.params;
    const { 
      PaymentStatus, 
      PaymentDate,
      PaymentMethodID,
      Amount,
      TransactionReference,
      Notes
    } = req.body;
    const userId = req.headers['x-user-id'] || 1;

    console.log('[DEBUG] ===== PAYMENT REQUEST RECEIVED =====');
    console.log('[DEBUG] InvoiceID:', InvoiceID);
    console.log('[DEBUG] PaymentStatus:', PaymentStatus);
    console.log('[DEBUG] Amount from request:', Amount, 'Type:', typeof Amount);
    console.log('[DEBUG] PaymentMethodID:', PaymentMethodID);
    console.log('[DEBUG] Full req.body:', JSON.stringify(req.body));
    console.log('[DEBUG] ==========================================');

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

    // First fetch the invoice to check the amount
    const invoiceCheckQuery = `
      SELECT invoiceid, totalamount FROM invoicemaster 
      WHERE invoiceid = $1 AND deletedat IS NULL
    `;
    const invoiceCheckResult = await pool.query(invoiceCheckQuery, [InvoiceID]);

    if (invoiceCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoiceTotalAmount = Number(invoiceCheckResult.rows[0].totalamount) || 0;
    const paymentAmount = Number(Amount) || 0;

    // Auto-determine payment status based on amount
    let finalPaymentStatus = PaymentStatus;
    if (Amount) {
      if (paymentAmount < invoiceTotalAmount) {
        finalPaymentStatus = 'Partial';
        console.log(`[AUTO-STATUS] Payment (₹${paymentAmount}) < Invoice Amount (₹${invoiceTotalAmount}), setting status to PARTIAL`);
      } else if (paymentAmount >= invoiceTotalAmount) {
        finalPaymentStatus = 'Paid';
        console.log(`[AUTO-STATUS] Payment (₹${paymentAmount}) >= Invoice Amount (₹${invoiceTotalAmount}), setting status to PAID`);
      }
    }

    const paymentDateValue = (finalPaymentStatus === 'Paid' || finalPaymentStatus === 'Partial') ? (PaymentDate || new Date().toISOString().split('T')[0]) : null;
    const updatedAt = new Date().toISOString().split('T')[0];

    const query = `
      UPDATE invoicemaster 
      SET paymentstatus = $1, 
          paymentdate = $2,
          updatedat = $3,
          updatedby = $4
      WHERE invoiceid = $5 AND deletedat IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [finalPaymentStatus, paymentDateValue, updatedAt, userId, InvoiceID]);

    // If payment status is "Paid" or "Partial" and we have amount, record payment details
    if ((finalPaymentStatus === 'Paid' || finalPaymentStatus === 'Partial') && Amount && PaymentMethodID) {
      try {
        // Get user's branch information
        const userQuery = `
          SELECT branchid FROM employeemaster 
          WHERE employeeid = $1 AND deletedat IS NULL
        `;
        const userResult = await pool.query(userQuery, [userId]);
        const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

        const invoiceAmount = result.rows[0].totalamount || 0;
        let vehicleID = result.rows[0].vehicleid;

        console.log('[DEBUG-CALC] Invoice amount from DB:', invoiceAmount, 'Type:', typeof invoiceAmount);
        console.log('[DEBUG-CALC] Total Amount from request:', Amount, 'Type:', typeof Amount);

        // Validate vehicleID exists in vehicledetail table
        if (vehicleID) {
          const vehicleCheckQuery = `
            SELECT vehicledetailid FROM vehicledetail 
            WHERE vehicledetailid = $1 AND deletedat IS NULL
          `;
          const vehicleCheckResult = await pool.query(vehicleCheckQuery, [vehicleID]);
          if (vehicleCheckResult.rows.length === 0) {
            console.log(`[WARNING] Vehicle ID ${vehicleID} does not exist in vehicledetail table. Setting to NULL.`);
            vehicleID = null;
          }
        }

        // Calculate the invoice payment amount (capped at invoice amount)
        const invoicePaymentAmount = Math.min(Number(Amount), Number(invoiceAmount));
        console.log('[DEBUG-CALC] Math.min calculation: min(' + Number(Amount) + ', ' + Number(invoiceAmount) + ') = ' + invoicePaymentAmount);

        // Create payment detail record for actual payment against invoice
        const paymentDetailData = {
          invoiceid: InvoiceID,
          vehicleid: vehicleID,
          paymentmethodid: PaymentMethodID,
          processedbyuserid: userId,
          branchid: userBranchID,
          paymentdate: paymentDateValue,
          amount: invoicePaymentAmount,  // Use calculated invoice payment amount
          transactionreference: TransactionReference || null,
          paymentstatus: 'Completed',
          notes: Notes || null,
          extravar1: null,
          extravar2: null,
          extraint1: null,
          createdby: userId
        };

        console.log('[DEBUG] Creating regular payment record with amount:', invoicePaymentAmount);
        const paymentDetailRecord = await PaymentDetail.create(paymentDetailData);
        console.log('[SUCCESS] Regular payment recorded:', paymentDetailRecord);

        // Check if payment exceeds invoice amount (overpayment/advance)
        const overpaymentAmount = Number(Amount) - invoicePaymentAmount;
        console.log(`[DEBUG] Overpayment calculation: ${Amount} - ${invoicePaymentAmount} = ${overpaymentAmount}`);

        // Check if total payments now equal or exceed invoice amount
        console.log('[DEBUG] Checking if invoice is fully paid...');
        const totalPaymentsQuery = `
          SELECT 
            COALESCE(SUM(CASE WHEN paymentstatus IN ('Paid', 'Completed') THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) AS totalpaid
          FROM paymentdetail
          WHERE invoiceid = $1 AND deletedat IS NULL
        `;
        const totalPaymentsResult = await pool.query(totalPaymentsQuery, [InvoiceID]);
        const totalPaidAmount = parseFloat(totalPaymentsResult.rows[0].totalpaid) || 0;
        const invoiceTotalFloat = parseFloat(invoiceTotalAmount);
        
        console.log(`[DEBUG-TOTAL] Invoice ${InvoiceID}: Total Amount = ₹${invoiceTotalFloat}, Total Paid = ₹${totalPaidAmount}`);
        console.log(`[DEBUG-TOTAL] Comparison: ${totalPaidAmount} >= ${invoiceTotalFloat}? ${totalPaidAmount >= invoiceTotalFloat}`);
        
        // Update invoice status if fully paid
        if (totalPaidAmount >= invoiceTotalFloat) {
          console.log(`[SUCCESS] Invoice ${InvoiceID} is now fully paid! Updating status to PAID`);
          const updateFullPaymentQuery = `
            UPDATE invoicemaster
            SET paymentstatus = 'Paid', updatedat = $1, updatedby = $2
            WHERE invoiceid = $3 AND deletedat IS NULL
            RETURNING invoiceid, paymentstatus
          `;
          const updateResult = await pool.query(updateFullPaymentQuery, [updatedAt, userId, InvoiceID]);
          console.log(`[SUCCESS-CONFIRM] Invoice status updated. Result:`, updateResult.rows[0]);
        } else {
          console.log(`[INFO] Invoice ${InvoiceID} not yet fully paid. Total: ₹${totalPaidAmount} < Required: ₹${invoiceTotalFloat}`);
        }

        if (overpaymentAmount > 0) {
          try {
            // Record overpayment as advance payment with invoiceid = NULL (null marks advance)
            const advancePaymentData = {
              invoiceid: null,  // NULL marks advance payment (not tied to specific invoice)
              vehicleid: vehicleID,
              paymentmethodid: PaymentMethodID,
              processedbyuserid: userId,
              branchid: userBranchID,
              paymentdate: paymentDateValue,
              amount: overpaymentAmount,
              transactionreference: TransactionReference || null,
              paymentstatus: 'Completed',
              notes: `Advance payment from overpayment on invoice ${result.rows[0].invoicenumber}`,
              extravar1: null,
              extravar2: null,
              extraint1: null,
              createdby: userId
            };

            console.log('[DEBUG] Creating advance payment with data:', JSON.stringify(advancePaymentData, null, 2));
            const advanceRecord = await PaymentDetail.create(advancePaymentData);
            console.log(`[✓ SUCCESS] Advance payment recorded ID=${advanceRecord.paymentreceivedid} | Amount: ₹${overpaymentAmount}`);
          } catch (advanceError) {
            console.error('[✗ ERROR] Failed to record advance payment:', advanceError.message);
            console.error('[✗ ERROR] Stack:', advanceError.stack);
            // Don't fail if advance payment recording fails
          }
        } else {
          console.log('[INFO] No overpayment - no advance payment needed');
        }
      } catch (error) {
        console.error('Error recording payment detail:', error);
        // Don't fail the payment status update if payment detail recording fails
        // Just log the error
      }
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
    const userId = req.headers['x-user-id'] || 1;

    // Get user's branch first
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    const query = `
      SELECT 
        COUNT(CASE WHEN im.paymentstatus = 'Paid' THEN 1 END) AS paidcount,
        COUNT(CASE WHEN im.paymentstatus = 'Unpaid' THEN 1 END) AS unpaidcount,
        COUNT(CASE WHEN im.paymentstatus = 'Partial' THEN 1 END) AS partialcount,
        COALESCE(SUM(CASE WHEN im.paymentstatus = 'Paid' THEN im.totalamount ELSE 0 END), 0) AS paidamount,
        COALESCE(SUM(CASE WHEN im.paymentstatus = 'Unpaid' THEN im.totalamount ELSE 0 END), 0) AS unpaidamount,
        COALESCE(SUM(CASE WHEN im.paymentstatus = 'Partial' THEN im.totalamount ELSE 0 END), 0) AS partialamount,
        COALESCE(SUM(im.totalamount), 0) AS totalamount
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      WHERE im.deletedat IS NULL AND im.branchid = $1
    `;

    const result = await pool.query(query, [userBranchID]);
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
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get user's branch ID
    const userQuery = `
      SELECT branchid
      FROM employeemaster
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userBranchId = userResult.rows[0].branchid;

    // Get payment methods for user's branch
    const paymentMethods = await PaymentMethodMaster.getByBranch(userBranchId);
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

// Record advance payment (payment without invoice)
exports.recordAdvancePayment = async (req, res) => {
  try {
    console.log('[ADVANCE-DEBUG] Request body:', req.body);
    console.log('[ADVANCE-DEBUG] Request headers:', req.headers);
    
    const { 
      invoiceid,
      amount,
      paymentmethodid,
      transactionreference,
      notes,
      paymentdate
    } = req.body;
    
    console.log('[ADVANCE-DEBUG] Extracted parameters:', {
      invoiceid,
      amount,
      paymentmethodid,
      transactionreference,
      notes,
      paymentdate
    });
    
    const userId = req.headers['x-user-id'] || 1;

    if (!amount || !paymentmethodid) {
      console.log('[ADVANCE-ERROR] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'amount and paymentmethodid are required'
      });
    }

    // Get user's branch information
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;
    
    console.log('[ADVANCE-DEBUG] User branch ID:', userBranchID);

    const paymentDateValue = paymentdate || new Date().toISOString().split('T')[0];

    // Get vehicle ID from the invoice that caused the overpayment
    let validVehicleId = null;
    if (invoiceid) {
      console.log('[ADVANCE-DEBUG] Getting vehicle ID from invoice:', invoiceid);
      const invoiceQuery = `
        SELECT vehicleid FROM invoicemaster 
        WHERE invoiceid = $1 AND deletedat IS NULL
      `;
      const invoiceResult = await pool.query(invoiceQuery, [invoiceid]);
      console.log('[ADVANCE-DEBUG] Invoice query result:', invoiceResult.rows);
      
      if (invoiceResult.rows.length > 0) {
        validVehicleId = invoiceResult.rows[0].vehicleid;
        console.log('[ADVANCE-DEBUG] Vehicle ID from invoice:', validVehicleId, 'Type:', typeof validVehicleId);
        
        if (!validVehicleId || validVehicleId === null) {
          console.log('[ADVANCE-WARNING] Invoice exists but has NULL vehicleid');
        }
      } else {
        console.log('[ADVANCE-WARNING] Invoice does not exist:', invoiceid);
      }
    } else {
      console.log('[ADVANCE-WARNING] No invoice ID provided for advance payment');
    }

    // Record advance payment with invoiceid = NULL (NULL marks advance)
    const advancePaymentData = {
      invoiceid: null,  // NULL marks advance payment (not tied to specific invoice)
      vehicleid: validVehicleId,  // Use validated vehicle ID (may be NULL)
      paymentmethodid: paymentmethodid,
      processedbyuserid: userId,
      branchid: userBranchID,
      paymentdate: paymentDateValue,
      amount: amount,
      transactionreference: transactionreference || null,
      paymentstatus: 'Completed',
      notes: notes || 'Advance payment',
      extravar1: null,
      extravar2: null,
      extraint1: null,
      createdby: userId
    };

    console.log('[ADVANCE-DEBUG] Creating payment record with data:', advancePaymentData);

    const paymentDetailRecord = await PaymentDetail.create(advancePaymentData);
    
    console.log('[ADVANCE-DEBUG] Payment record created:', paymentDetailRecord);

    res.status(200).json({
      success: true,
      data: paymentDetailRecord,
      message: `Advance payment of ₹${amount} recorded successfully`
    });
  } catch (error) {
    console.error('[ADVANCE-ERROR] Error recording advance payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record advance payment',
      error: error.message
    });
  }
};

// Get vehicle advance balance (sum of payments with invoiceid = NULL)
exports.getCustomerAdvanceBalance = async (req, res) => {
  try {
    const { vehicleid } = req.params;

    if (!vehicleid) {
      return res.status(400).json({
        success: false,
        message: 'vehicleid is required'
      });
    }

    const query = `
      SELECT 
        COALESCE(SUM(amount), 0) as totalbalance,
        COUNT(*) as transactioncount
      FROM paymentdetail
      WHERE vehicleid = $1
      AND invoiceid IS NULL
      AND deletedat IS NULL
    `;

    const result = await pool.query(query, [vehicleid]);
    const data = result.rows[0] || { totalbalance: 0, transactioncount: 0 };

    res.status(200).json({
      success: true,
      data: {
        vehicleid: vehicleid,
        advanceBalance: parseFloat(data.totalbalance),
        transactionCount: parseInt(data.transactioncount),
        currency: '₹'
      },
      message: 'Vehicle advance balance retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching customer advance balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer advance balance',
      error: error.message
    });
  }
};

// Get advance payment transactions (payments with invoiceid = NULL)
exports.getCustomerAdvanceTransactions = async (req, res) => {
  try {
    const { vehicleid } = req.params;

    if (!vehicleid) {
      return res.status(400).json({
        success: false,
        message: 'vehicleid is required'
      });
    }

    const query = `
      SELECT 
        paymentreceivedid,
        vehicleid,
        paymentmethodid,
        paymentdate,
        amount,
        transactionreference,
        notes,
        createdby,
        createdat
      FROM paymentdetail
      WHERE vehicleid = $1
      AND invoiceid IS NULL
      AND deletedat IS NULL
      ORDER BY createdat DESC
    `;

    const result = await pool.query(query, [vehicleid]);

    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Advance transactions retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching customer advance transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer advance transactions',
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
