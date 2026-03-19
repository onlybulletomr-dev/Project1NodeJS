const pool = require('../config/db');

class PointsTransaction {
  /**
   * Create a new points transaction when vendor purchases items
   * Points are taken from the item's points field in ItemMaster
   */
  static async create(data) {
    const {
      invoiceid,
      itemid,
      invoicedetailid,
      branchid,
      quantitypurchased,
      transactiontype = 'PURCHASE',
      remarks = null,
      createdby,
    } = data;

    try {
      // Get points from item master
      const itemResult = await pool.query(
        `SELECT points FROM itemmaster WHERE itemid = $1 AND deletedat IS NULL`,
        [itemid]
      );

      if (itemResult.rows.length === 0) {
        throw new Error(`Item not found`);
      }

      const pointsPerUnit = itemResult.rows[0].points || 0;
      const totalpointsawarded = quantitypurchased * pointsPerUnit;

      const result = await pool.query(
        `INSERT INTO pointstransaction (
          invoiceid, itemid, invoicedetailid, branchid, quantitypurchased, 
          pointsperunit, totalpointsawarded, transactiontype, remarks, createdby, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING *`,
        [invoiceid, itemid, invoicedetailid, branchid, quantitypurchased, 
         pointsPerUnit, totalpointsawarded, transactiontype, remarks, createdby]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating points transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  static async getById(transactionId) {
    try {
      const result = await pool.query(
        `SELECT pt.*,
                im.itemname, im.partnumber,
                iv.invoicenumber
         FROM pointstransaction pt
         JOIN itemmaster im ON pt.itemid = im.itemid
         JOIN invoicemaster iv ON pt.invoiceid = iv.invoiceid
         WHERE pt.pointstransactionid = $1 AND pt.deletedat IS NULL`,
        [transactionId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching points transaction:', error);
      throw error;
    }
  }

  /**
   * Get all transactions for a branch (for purchases)
   */
  static async getByBranch(branchId, limit = 100, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT pt.*,
                im.itemname, im.partnumber,
                iv.invoicenumber,
                em.employeename
         FROM pointstransaction pt
         JOIN itemmaster im ON pt.itemid = im.itemid
         JOIN invoicemaster iv ON pt.invoiceid = iv.invoiceid
         LEFT JOIN employeemaster em ON pt.createdby = em.employeeid
         WHERE pt.branchid = $1 AND pt.deletedat IS NULL
         ORDER BY pt.createdat DESC
         LIMIT $2 OFFSET $3`,
        [branchId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching transactions by branch:', error);
      throw error;
    }
  }

  /**
   * Get total points for a specific item
   */
  static async getTotalPointsByItem(itemId, branchId = null) {
    try {
      let query = `
        SELECT 
          SUM(totalpointsawarded) as totalpointsawarded,
          COUNT(*) as transactioncount,
          itemid
        FROM pointstransaction
        WHERE itemid = $1 AND deletedat IS NULL
      `;

      const params = [itemId];

      if (branchId) {
        query += ` AND branchid = $2`;
        params.push(branchId);
      }

      query += ` GROUP BY itemid`;

      const result = await pool.query(query, params);
      return result.rows[0] || { totalpointsawarded: 0, transactioncount: 0 };
    } catch (error) {
      console.error('Error getting total points by item:', error);
      throw error;
    }
  }

  /**
   * Get purchase report with points breakdown
   */
  static async getPurchaseReport(branchId, dateFrom = null, dateTo = null) {
    try {
      let query = `
        SELECT 
          pt.pointstransactionid,
          pt.invoiceid,
          iv.invoicenumber,
          TO_CHAR(iv.invoicedate, 'YYYY-MM-DD') as invoicedate,
          pt.itemid,
          im.partnumber,
          im.itemname,
          pt.quantitypurchased,
          pt.pointsperunit,
          pt.totalpointsawarded,
          em.employeename as createdby_name,
          TO_CHAR(pt.createdat, 'YYYY-MM-DD') as createddate
        FROM pointstransaction pt
        JOIN invoicemaster iv ON pt.invoiceid = iv.invoiceid
        JOIN itemmaster im ON pt.itemid = im.itemid
        LEFT JOIN employeemaster em ON pt.createdby = em.employeeid
        WHERE pt.branchid = $1 AND pt.deletedat IS NULL
      `;

      const params = [branchId];
      let paramIndex = 2;

      if (dateFrom) {
        query += ` AND iv.invoicedate >= $${paramIndex}::DATE`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND iv.invoicedate <= $${paramIndex}::DATE`;
        params.push(dateTo);
        paramIndex++;
      }

      query += ` ORDER BY iv.invoicedate DESC, pt.createdat DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error generating purchase report:', error);
      throw error;
    }
  }

  /**
   * Get points summary report (total points per item)
   */
  static async getPointsSummaryReport(branchId) {
    try {
      const result = await pool.query(
        `SELECT 
          pt.itemid,
          im.partnumber,
          im.itemname,
          COUNT(*) as purchasecount,
          SUM(pt.quantitypurchased) as totalquantity,
          AVG(pt.pointsperunit) as avgpointsperunit,
          SUM(pt.totalpointsawarded) as totalpointsawarded
         FROM pointstransaction pt
         JOIN itemmaster im ON pt.itemid = im.itemid
         WHERE pt.branchid = $1 AND pt.deletedat IS NULL
         GROUP BY pt.itemid, im.partnumber, im.itemname
         ORDER BY SUM(pt.totalpointsawarded) DESC`,
        [branchId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error generating points summary report:', error);
      throw error;
    }
  }

  /**
   * Get transactions by invoice ID
   */
  static async getByInvoice(invoiceId) {
    try {
      const result = await pool.query(
        `SELECT pt.*, im.itemname, im.partnumber
         FROM pointstransaction pt
         JOIN itemmaster im ON pt.itemid = im.itemid
         WHERE pt.invoiceid = $1 AND pt.deletedat IS NULL
         ORDER BY pt.createdat`,
        [invoiceId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching points by invoice:', error);
      throw error;
    }
  }

  /**
   * Soft delete transaction (reversing a purchase)
   */
  static async delete(transactionId, deletedby) {
    try {
      const result = await pool.query(
        `UPDATE pointstransaction 
         SET deletedat = CURRENT_TIMESTAMP, updatedby = $1
         WHERE pointstransactionid = $2
         RETURNING *`,
        [deletedby, transactionId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
}

module.exports = PointsTransaction;
