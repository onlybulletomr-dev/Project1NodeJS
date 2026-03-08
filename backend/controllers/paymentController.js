const pool = require('../config/db');
const PaymentMethodMaster = require('../models/PaymentMethodMaster');
const PaymentDetail = require('../models/PaymentDetail');

// Get all unpaid and partially paid invoices
exports.getUnpaidInvoices = async (req, res) => {
  try {
    console.log('=== GET UNPAID INVOICES REQUEST ===');
    const userId = req.headers['x-user-id'] || 1;
    console.log('User ID:', userId);

    // Get user's branch first
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;
    console.log('User Branch ID:', userBranchID);

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
    
    console.log('Executing query with userBranchID:', userBranchID);
    const result = await pool.query(query, [userBranchID]);
    console.log('Query result rows:', result.rows.length);
    console.log('[PAYMENT API] Unpaid invoices result:');
    result.rows.forEach(row => {
      console.log(`  Invoice: ${row.invoicenumber}, VehicleID: ${row.vehicleid}, VehicleNumber: ${row.vehiclenumber}`);
    });
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Unpaid invoices retrieved successfully'
    });
  } catch (error) {
    console.error('=== ERROR fetching unpaid invoices ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unpaid invoices',
      error: error.message
    });
  }
};

// Get invoices by payment status with payment line items
exports.getInvoicesByStatus = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 1;
    const statusParam = (req.query.status || 'Unpaid').toString().trim();

    const statusMap = {
      paid: 'Paid',
      unpaid: 'Unpaid',
      pending: 'Pending',
      partial: 'Partial'
    };

    const normalizedStatus = statusMap[statusParam.toLowerCase()];

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use one of: Paid, Unpaid/Pending, Partial'
      });
    }

    const userQuery = `
      SELECT branchid FROM employeemaster
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    // Build WHERE clause - 'Unpaid' should include both 'Unpaid' and 'Pending' invoices
    let whereClause = `WHERE im.deletedat IS NULL
      AND im.branchid = $1`;
    let queryParams = [userBranchID];

    if (normalizedStatus === 'Unpaid') {
      whereClause += ` AND COALESCE(im.paymentstatus, 'Unpaid') IN ('Unpaid', 'Pending')`;
    } else {
      whereClause += ` AND COALESCE(im.paymentstatus, 'Unpaid') = $2`;
      queryParams.push(normalizedStatus);
    }

    const query = `
      SELECT
        im.invoiceid,
        im.invoicenumber,
        COALESCE(im.vehiclenumber, '') AS vehiclenumber,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') AS customername,
        cm.mobilenumber1 AS phonenumber,
        COALESCE(im.totalamount, 0) AS totalamount,
        COALESCE(im.paymentstatus, 'Unpaid') AS paymentstatus,
        im.createdat,
        im.paymentdate AS invoicepaymentdate,
        im.customerid,
        im.vehicleid,
        COALESCE(totals.amountpaid, 0) AS amountpaid,
        COALESCE(im.totalamount, 0) - COALESCE(totals.amountpaid, 0) AS amounttobepaid,
        COALESCE(lastpayment.lastpaymentdate, NULL) AS lastpaymentdate
      FROM invoicemaster im
      LEFT JOIN customermaster cm
        ON im.customerid = cm.customerid
        AND cm.deletedat IS NULL
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CASE WHEN p2.paymentstatus IN ('Paid', 'Completed') THEN p2.amount ELSE 0 END), 0) AS amountpaid
        FROM paymentdetail p2
        WHERE p2.invoiceid = im.invoiceid
          AND p2.deletedat IS NULL
      ) totals ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(pd.paymentdate) AS lastpaymentdate
        FROM paymentdetail pd
        WHERE pd.invoiceid = im.invoiceid
          AND pd.deletedat IS NULL
          AND pd.paymentstatus IN ('Paid', 'Completed')
      ) lastpayment ON TRUE
      ${whereClause}
      ORDER BY im.createdat DESC
    `;

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      success: true,
      data: result.rows,
      status: normalizedStatus,
      message: `${normalizedStatus} invoices retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching invoices by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices by status',
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

    // First get vehicle details directly from vehicledetail table
    // Handle both Render schema (vehicleid, registrationnumber) and Local schema (vehicledetailid, vehiclenumber)
    let vehicleData = null;
    
    try {
      // Try Render schema first (vehicleid, registrationnumber, model, color)
      const vehicleQuery = `
        SELECT 
          vehicleid, 
          registrationnumber as vehiclenumber, 
          model as vehiclemodel, 
          color as vehiclecolor
        FROM vehicledetail
        WHERE vehicleid = $1 AND deletedat IS NULL
        LIMIT 1
      `;
      console.log('[PAYMENT API] Trying Render schema for vehicleId:', vehicleId);
      const vehicleResult = await pool.query(vehicleQuery, [vehicleId]);
      if (vehicleResult.rows.length > 0) {
        vehicleData = vehicleResult.rows[0];
        console.log('[PAYMENT API] Found vehicle using Render schema:', vehicleData);
      } else {
        throw new Error('Not found in Render schema, trying local schema');
      }
    } catch (renderError) {
      try {
        // Try local schema (vehicledetailid, vehiclenumber, vehiclemodel, vehiclecolor)
        const localQuery = `
          SELECT 
            vehicledetailid as vehicleid, 
            vehiclenumber, 
            vehiclemodel, 
            vehiclecolor
          FROM vehicledetail
          WHERE vehicledetailid = $1 AND deletedat IS NULL
          LIMIT 1
        `;
        console.log('[PAYMENT API] Trying local schema for vehicleId:', vehicleId);
        const localResult = await pool.query(localQuery, [vehicleId]);
        if (localResult.rows.length > 0) {
          vehicleData = localResult.rows[0];
          console.log('[PAYMENT API] Found vehicle using local schema:', vehicleData);
        } else {
          console.log('[PAYMENT API] Vehicle not found in either schema');
        }
      } catch (localError) {
        console.error('[PAYMENT API] Error trying local schema:', localError.message);
      }
    }
    
    console.log('[PAYMENT API] Final vehicle data being returned:', vehicleData);

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
    
    // If vehicle data not found, use first invoice's vehicle info as fallback
    const finalVehicleData = vehicleData || (invoicesResult.rows.length > 0 ? {
      vehicleid: invoicesResult.rows[0].vehicleid,
      vehiclenumber: invoicesResult.rows[0].vehiclenumber,
      vehiclemodel: 'N/A',
      vehiclecolor: 'N/A'
    } : { vehiclenumber: 'N/A' });
    
    console.log('[PAYMENT API] Final vehicle data being sent:', finalVehicleData);

    res.status(200).json({
      success: true,
      data: {
        vehicle: finalVehicleData,
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

    console.log('\n=== UPDATE PAYMENT STATUS REQUEST ===');
    console.log('InvoiceID:', InvoiceID);
    console.log('PaymentStatus:', PaymentStatus);
    console.log('PaymentMethodID:', PaymentMethodID, `(type: ${typeof PaymentMethodID})`);
    console.log('Amount:', Amount, `(type: ${typeof Amount})`);
    console.log('TransactionReference:', TransactionReference);
    console.log('Notes:', Notes);
    console.log('UserId:', userId);
    console.log('===================================\n');

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

    console.log('[PAYMENT STATUS UPDATE] Invoice status updated to:', finalPaymentStatus);
    console.log('[PAYMENT DETAIL CHECK] Conditions for creating payment detail:');
    console.log('  - finalPaymentStatus is Paid or Partial?', (finalPaymentStatus === 'Paid' || finalPaymentStatus === 'Partial'));
    console.log('  - Amount provided?', !!Amount, `(Amount=${Amount})`);
    console.log('  - PaymentMethodID provided?', !!PaymentMethodID, `(PaymentMethodID=${PaymentMethodID})`);

    // If payment status is "Paid" or "Partial" and we have amount, record payment details
    if ((finalPaymentStatus === 'Paid' || finalPaymentStatus === 'Partial') && Amount && PaymentMethodID) {
      console.log('[PAYMENT DETAIL] Creating payment detail record...');
      try {
        // Validate PaymentMethodID
        const paymentMethodID = Number(PaymentMethodID);
        
        console.log('[PAYMENT METHOD VALIDATION] PaymentMethodID input:', PaymentMethodID, `(type: ${typeof PaymentMethodID})`);
        console.log('[PAYMENT METHOD VALIDATION] After Number():', paymentMethodID, `(isNaN: ${isNaN(paymentMethodID)})`);
        
        if (isNaN(paymentMethodID)) {
          console.error('[ERROR] Invalid PaymentMethodID (not a number):', PaymentMethodID);
          return res.status(400).json({
            success: false,
            message: 'Invalid PaymentMethodID. Must be a valid payment method ID.',
            details: `Received: ${PaymentMethodID} (type: ${typeof PaymentMethodID})`
          });
        }

        // Verify payment method exists
        const paymentMethodCheck = await PaymentMethodMaster.getById(paymentMethodID);
        if (!paymentMethodCheck) {
          console.error('[ERROR] PaymentMethodID not found in paymentmethodmaster:', paymentMethodID);
          return res.status(400).json({
            success: false,
            message: 'Invalid PaymentMethodID. Payment method not found.',
            details: `PaymentMethodID ${paymentMethodID} does not exist in the database`
          });
        }
        
        console.log('[PAYMENT VALIDATION] PaymentMethod verified:', paymentMethodCheck.methodname, `(ID: ${paymentMethodID})`);;
        
        // Get user's branch information
        const userQuery = `
          SELECT branchid FROM employeemaster 
          WHERE employeeid = $1 AND deletedat IS NULL
        `;
        const userResult = await pool.query(userQuery, [userId]);
        const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

        const invoiceAmount = result.rows[0].totalamount || 0;
        let vehicleID = result.rows[0].vehicleid;

        // Validate that vehicleID exists in vehicledetail table (FK references vehicledetailid)
        let finalVehicleID = null;
        if (vehicleID) {
          try {
            // The FK constraint references vehicledetail(vehicledetailid), so check that column
            const vehicleCheckQuery = `
              SELECT vehicledetailid FROM vehicledetail 
              WHERE vehicledetailid = $1 AND deletedat IS NULL
              LIMIT 1
            `;
            const vehicleCheckResult = await pool.query(vehicleCheckQuery, [vehicleID]);
            if (vehicleCheckResult.rows.length > 0) {
              finalVehicleID = vehicleID;
              console.log('[VEHICLE VALIDATION] Vehicle ID exists:', vehicleID);
            } else {
              console.warn('[VEHICLE VALIDATION] Vehicle ID does not exist in vehicledetail table:', vehicleID, '- will set to NULL in payment record');
              finalVehicleID = null;
            }
          } catch (err) {
            console.warn('[VEHICLE VALIDATION] Error checking vehicle:', err.message, '- will set to NULL');
            finalVehicleID = null;
          }
        }

        // Calculate the invoice payment amount (capped at invoice amount)
        const invoicePaymentAmount = Math.min(Number(Amount), Number(invoiceAmount));

        // Create payment detail record for actual payment against invoice
        const paymentDetailData = {
          invoiceid: InvoiceID,
          vehicleid: finalVehicleID,
          paymentmethodid: paymentMethodID,  // Use validated ID
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

        console.log('[PAYMENT DETAIL DATA] About to create payment detail with:', JSON.stringify(paymentDetailData, null, 2));
        
        const paymentDetailRecord = await PaymentDetail.create(paymentDetailData);
        console.log('[SUCCESS] Regular payment recorded:', JSON.stringify(paymentDetailRecord, null, 2));

        // Check if payment exceeds invoice amount (overpayment/advance)
        const overpaymentAmount = Number(Amount) - invoicePaymentAmount;

        // Check if total payments now equal or exceed invoice amount
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
            // Advance is tied to the vehicle
            const advancePaymentData = {
              invoiceid: null,  // NULL marks advance payment (not tied to specific invoice)
              vehicleid: finalVehicleID,  // Tied to the vehicle that made the overpayment
              paymentmethodid: paymentMethodID,  // Use validated method ID
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

            console.log('[ADVANCE PAYMENT] Recording advance with vehicleid:', finalVehicleID, 'amount:', overpaymentAmount);
            
            // Only create advance record if we have a valid vehicle ID
            if (finalVehicleID) {
              const advanceRecord = await PaymentDetail.create(advancePaymentData);
              console.log('[SUCCESS] Advance payment recorded:', JSON.stringify(advanceRecord, null, 2));
            } else {
              console.warn('[ADVANCE PAYMENT WARNING] Cannot record advance payment - no valid vehicle ID. VehicleID from invoice was invalid.');
            }
          } catch (advanceError) {
            console.warn('[ADVANCE PAYMENT ERROR]:', advanceError.message);
            console.error('[ADVANCE PAYMENT ERROR DETAIL]:', advanceError);
            // Silently fail if advance payment recording fails
          }
        } else {

        }
      } catch (error) {
        console.error('[ERROR-PAYMENT-DETAIL] Error recording payment detail:', error.message);
        console.error('[ERROR-PAYMENT-DETAIL] Error code:', error.code);
        console.error('[ERROR-PAYMENT-DETAIL] Error constraint:', error.constraint);
        console.error('[ERROR-PAYMENT-DETAIL] Error detail:', error.detail);
        console.error('[ERROR-PAYMENT-DETAIL] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        // Don't fail the payment status update if payment detail recording fails
        // Just log the error
      }
    } else {
      console.log('[CONDITION-FAILED] NO - Payment detail NOT created. One or more conditions failed:');
      console.log('[CONDITION-FAILED] finalPaymentStatus is Paid/Partial?', (finalPaymentStatus === 'Paid' || finalPaymentStatus === 'Partial'));
      console.log('[CONDITION-FAILED] Amount is truthy?', !!Amount);
      console.log('[CONDITION-FAILED] PaymentMethodID is truthy?', !!PaymentMethodID);
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
        COUNT(CASE WHEN im.paymentstatus IN ('Unpaid', 'Pending') THEN 1 END) AS unpaidcount,
        COUNT(CASE WHEN im.paymentstatus = 'Partial' THEN 1 END) AS partialcount,
        COALESCE(SUM(CASE WHEN im.paymentstatus = 'Paid' THEN im.totalamount ELSE 0 END), 0) AS paidamount,
        COALESCE(SUM(CASE WHEN im.paymentstatus IN ('Unpaid', 'Pending') THEN im.totalamount ELSE 0 END), 0) AS unpaidamount,
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
    const { 
      invoiceid,
      amount,
      paymentmethodid,
      transactionreference,
      notes,
      paymentdate
    } = req.body;
    
    const userId = req.headers['x-user-id'] || 1;

    if (!amount || !paymentmethodid) {
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

    const paymentDateValue = paymentdate || new Date().toISOString().split('T')[0];

    // Get vehicle ID from the invoice that caused the overpayment
    let validVehicleId = null;
    if (invoiceid) {
      const invoiceQuery = `
        SELECT vehicleid FROM invoicemaster 
        WHERE invoiceid = $1 AND deletedat IS NULL
      `;
      const invoiceResult = await pool.query(invoiceQuery, [invoiceid]);
      
      if (invoiceResult.rows.length > 0) {
        validVehicleId = invoiceResult.rows[0].vehicleid;
      }
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

    const paymentDetailRecord = await PaymentDetail.create(advancePaymentData);
    
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

// Get payment history for a specific invoice
exports.getPaymentHistoryByInvoice = async (req, res) => {
  try {
    const { InvoiceID } = req.params;
    const userId = req.headers['x-user-id'] || 1;

    if (!InvoiceID) {
      return res.status(400).json({
        success: false,
        message: 'InvoiceID is required'
      });
    }

    // Get user's branch
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    // Get invoice details first
    const invoiceQuery = `
      SELECT 
        invoiceid,
        invoicenumber,
        vehiclenumber,
        totalamount,
        paymentstatus,
        createdat,
        COALESCE(paymentdate, createdat) as paymentdate
      FROM invoicemaster
      WHERE invoiceid = $1 AND branchid = $2 AND deletedat IS NULL
    `;
    const invoiceResult = await pool.query(invoiceQuery, [InvoiceID, userBranchID]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoiceData = invoiceResult.rows[0];

    // Get all payment details for this invoice
    const paymentQuery = `
      SELECT 
        paymentreceivedid,
        invoiceid,
        paymentdate,
        amount,
        paymentstatus,
        transactionreference,
        notes,
        pm.methodname as paymentmethod,
        createdby,
        createdat
      FROM paymentdetail pd
      LEFT JOIN paymentmethodmaster pm ON pd.paymentmethodid = pm.paymentmethodid
      WHERE pd.invoiceid = $1 AND pd.deletedat IS NULL
      ORDER BY pd.createdat DESC
    `;
    const paymentResult = await pool.query(paymentQuery, [InvoiceID]);

    // Calculate totals
    const totalPaid = paymentResult.rows.reduce((sum, row) => {
      if (row.paymentstatus === 'Paid' || row.paymentstatus === 'Completed') {
        return sum + parseFloat(row.amount || 0);
      }
      return sum;
    }, 0);

    const pendingAmount = parseFloat(invoiceData.totalamount) - totalPaid;

    res.status(200).json({
      success: true,
      data: {
        invoice: {
          invoiceid: invoiceData.invoiceid,
          invoicenumber: invoiceData.invoicenumber,
          vehiclenumber: invoiceData.vehiclenumber,
          totalamount: invoiceData.totalamount,
          paymentstatus: invoiceData.paymentstatus,
          totalPaid: totalPaid.toFixed(2),
          pendingAmount: pendingAmount.toFixed(2),
          invoiceDate: invoiceData.createdat,
          lastPaymentDate: paymentResult.rows.length > 0 ? paymentResult.rows[0].paymentdate : null
        },
        payments: paymentResult.rows
      },
      message: 'Payment history retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
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

// Get payment history for a specific invoice
exports.getPaymentHistory = async (req, res) => {
  try {
    const { invoiceid } = req.params;
    const userId = req.headers['x-user-id'] || 1;

    if (!invoiceid) {
      return res.status(400).json({
        success: false,
        message: 'invoiceid is required'
      });
    }

    // Get user's branch
    const userQuery = `
      SELECT branchid FROM employeemaster 
      WHERE employeeid = $1 AND deletedat IS NULL
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userBranchID = userResult.rows.length > 0 ? userResult.rows[0].branchid : 1;

    // Get invoice details
    const invoiceQuery = `
      SELECT 
        invoiceid,
        invoicenumber,
        vehiclenumber,
        totalamount,
        paymentstatus,
        createdat
      FROM invoicemaster
      WHERE invoiceid = $1 AND deletedat IS NULL AND branchid = $2
    `;
    const invoiceResult = await pool.query(invoiceQuery, [invoiceid, userBranchID]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];

    // Get all payments for this invoice
    const paymentsQuery = `
      SELECT 
        pd.paymentreceivedid,
        pd.paymentdate,
        pd.amount,
        pm.methodname as paymentmethod,
        pd.notes,
        pd.paymentstatus
      FROM paymentdetail pd
      LEFT JOIN paymentmethodmaster pm
        ON pm.paymentmethodid = pd.paymentmethodid
        AND pm.deletedat IS NULL
      WHERE pd.invoiceid = $1 
        AND pd.deletedat IS NULL
      ORDER BY pd.paymentdate DESC
    `;
    const paymentsResult = await pool.query(paymentsQuery, [invoiceid]);

    res.status(200).json({
      success: true,
      data: {
        invoice: invoice,
        payments: paymentsResult.rows
      },
      message: 'Payment history retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};
