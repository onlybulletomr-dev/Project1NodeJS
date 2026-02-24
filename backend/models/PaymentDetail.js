const pool = require('../config/db');

class PaymentDetail {
  static async create(paymentData) {
    try {
      const {
        invoiceid,
        vehicleid,
        paymentmethodid,
        processedbyuserid,
        branchid,
        paymentdate,
        amount,
        transactionreference,
        paymentstatus,
        notes,
        extravar1,
        extravar2,
        extraint1,
        createdby,
      } = paymentData;

      const query = `
        INSERT INTO paymentdetail (
          invoiceid,
          vehicleid,
          paymentmethodid,
          processedbyuserid,
          branchid,
          paymentdate,
          amount,
          transactionreference,
          paymentstatus,
          notes,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()::DATE)
        RETURNING *
      `;

      const values = [
        invoiceid,
        vehicleid,
        paymentmethodid,
        processedbyuserid,
        branchid,
        paymentdate,
        amount,
        transactionreference,
        paymentstatus || 'Completed',
        notes,
        extravar1,
        extravar2,
        extraint1,
        createdby,
      ];

      console.log('[PaymentDetail.create] Executing INSERT query');
      console.log('[PaymentDetail.create] Values:', JSON.stringify(values, null, 2));
      
      const result = await pool.query(query, values);
      
      console.log('[PaymentDetail.create] Query executed successfully');
      console.log('[PaymentDetail.create] Returned row:', JSON.stringify(result.rows[0], null, 2));

      return result.rows[0];
    } catch (error) {
      console.error('Error creating payment detail:', error);
      throw error;
    }
  }

  static async getByInvoiceID(invoiceid) {
    try {
      const query = `
        SELECT 
          paymentreceivedid,
          invoiceid,
          vehicleid,
          paymentmethodid,
          processedbyuserid,
          branchid,
          paymentdate,
          amount,
          transactionreference,
          paymentstatus,
          notes,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat,
          updatedby,
          updatedat,
          deletedby,
          deletedat
        FROM paymentdetail
        WHERE invoiceid = $1
        AND deletedat IS NULL
        ORDER BY createdat DESC
      `;
      const result = await pool.query(query, [invoiceid]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  static async getByPaymentReceivedID(paymentreceivedid) {
    try {
      const query = `
        SELECT 
          paymentreceivedid,
          invoiceid,
          vehicleid,
          paymentmethodid,
          processedbyuserid,
          branchid,
          paymentdate,
          amount,
          transactionreference,
          paymentstatus,
          notes,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat,
          updatedby,
          updatedat,
          deletedby,
          deletedat
        FROM paymentdetail
        WHERE paymentreceivedid = $1
        AND deletedat IS NULL
      `;
      const result = await pool.query(query, [paymentreceivedid]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching payment detail:', error);
      throw error;
    }
  }

  static async getByBranchID(branchid) {
    try {
      const query = `
        SELECT 
          paymentreceivedid,
          invoiceid,
          vehicleid,
          paymentmethodid,
          processedbyuserid,
          branchid,
          paymentdate,
          amount,
          transactionreference,
          paymentstatus,
          notes,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat,
          updatedby,
          updatedat,
          deletedby,
          deletedat
        FROM paymentdetail
        WHERE branchid = $1
        AND deletedat IS NULL
        ORDER BY paymentdate DESC
      `;
      const result = await pool.query(query, [branchid]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching payment details by branch:', error);
      throw error;
    }
  }

  static async update(paymentreceivedid, updateData) {
    try {
      const {
        paymentstatus,
        transactionreference,
        notes,
        extravar1,
        extravar2,
        extraint1,
        updatedby,
      } = updateData;

      const query = `
        UPDATE paymentdetail
        SET 
          paymentstatus = COALESCE($1, paymentstatus),
          transactionreference = COALESCE($2, transactionreference),
          notes = COALESCE($3, notes),
          extravar1 = COALESCE($4, extravar1),
          extravar2 = COALESCE($5, extravar2),
          extraint1 = COALESCE($6, extraint1),
          updatedby = $7,
          updatedat = NOW()::DATE
        WHERE paymentreceivedid = $8
        AND deletedat IS NULL
        RETURNING *
      `;

      const result = await pool.query(query, [
        paymentstatus,
        transactionreference,
        notes,
        extravar1,
        extravar2,
        extraint1,
        updatedby,
        paymentreceivedid,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating payment detail:', error);
      throw error;
    }
  }

  static async delete(paymentreceivedid, deletedby) {
    try {
      const query = `
        UPDATE paymentdetail
        SET 
          deletedby = $1,
          deletedat = NOW()::DATE
        WHERE paymentreceivedid = $2
        RETURNING *
      `;

      const result = await pool.query(query, [deletedby, paymentreceivedid]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting payment detail:', error);
      throw error;
    }
  }
}

module.exports = PaymentDetail;
