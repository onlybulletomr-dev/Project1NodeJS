const pool = require('../config/db');

class PaymentMethodMaster {
  static async getAll() {
    try {
      const query = `
        SELECT 
          paymentmethodid,
          methodname,
          branchid,
          isdigital,
          isactive,
          transactionfeerate,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat,
          updatedby,
          updatedat,
          deletedby,
          deletedat
        FROM paymentmethodmaster
        WHERE deletedby IS NULL
        ORDER BY methodname
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const query = `
        SELECT 
          paymentmethodid,
          methodname,
          branchid,
          isdigital,
          isactive,
          transactionfeerate,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat,
          updatedby,
          updatedat,
          deletedby,
          deletedat
        FROM paymentmethodmaster
        WHERE paymentmethodid = $1 AND deletedby IS NULL
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching payment method:', error);
      throw error;
    }
  }

  static async getActive() {
    try {
      const query = `
        SELECT 
          paymentmethodid,
          methodname,
          branchid,
          isdigital,
          isactive,
          transactionfeerate,
          extravar1,
          extravar2,
          extraint1,
          createdby,
          createdat,
          updatedby,
          updatedat,
          deletedby,
          deletedat
        FROM paymentmethodmaster
        WHERE isactive = true AND deletedby IS NULL
        ORDER BY methodname
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active payment methods:', error);
      throw error;
    }
  }
}

module.exports = PaymentMethodMaster;
