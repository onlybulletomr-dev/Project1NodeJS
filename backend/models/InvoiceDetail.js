const pool = require('../config/db');

class InvoiceDetail {
  static async create(data) {
    const {
      InvoiceID,
      ItemID,
      Qty,
      UnitPrice,
      LineDiscount,
      LineTotal,
      LineItemTax1,
      LineItemTax2,
      CreatedBy,
    } = data;

    const CreatedAt = new Date().toISOString().split('T')[0];

    const insertValues = [InvoiceID, ItemID, Qty, UnitPrice, LineDiscount, LineTotal, LineItemTax1 || 0, LineItemTax2 || 0, CreatedBy, CreatedAt];

    try {
      const result = await pool.query(
        `INSERT INTO invoicedetail (
          invoiceid, itemid, qty, unitprice, linediscount, linetotal, lineitemtax1, lineitemtax2, createdby, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        insertValues
      );

      return result.rows[0];
    } catch (error) {
      // Render compatibility: some DBs may not auto-generate invoicedetailid
      const isInvoiceDetailIdNullError = /null value in column\s+"?invoicedetailid"?/i.test(error.message || '');
      if (isInvoiceDetailIdNullError) {
        const idResult = await pool.query('SELECT COALESCE(MAX(invoicedetailid), 0) + 1 AS nextid FROM invoicedetail');
        const nextInvoiceDetailId = idResult.rows[0].nextid;

        const fallbackResult = await pool.query(
          `INSERT INTO invoicedetail (
            invoicedetailid, invoiceid, itemid, qty, unitprice, linediscount, linetotal, lineitemtax1, lineitemtax2, createdby, createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [nextInvoiceDetailId, ...insertValues]
        );

        return fallbackResult.rows[0];
      }

      throw error;
    }
  }

  static async getByInvoiceId(invoiceId) {
    const result = await pool.query(
      `SELECT * FROM invoicedetail WHERE invoiceid = $1 AND deletedat IS NULL ORDER BY invoicedetailid`,
      [invoiceId]
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT * FROM invoicedetail WHERE invoicedetailid = $1 AND deletedat IS NULL`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const {
      ItemID,
      Qty,
      UnitPrice,
      LineDiscount,
      LineTotal,
      LineItemTax1,
      LineItemTax2,
      UpdatedBy,
    } = data;

    const UpdatedAt = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE invoicedetail SET
        itemid = $1, qty = $2, unitprice = $3, linediscount = $4, linetotal = $5, lineitemtax1 = $6, lineitemtax2 = $7, updatedby = $8, updatedat = $9
      WHERE invoicedetailid = $10 AND deletedat IS NULL
      RETURNING *`,
      [ItemID, Qty, UnitPrice, LineDiscount, LineTotal, LineItemTax1 || 0, LineItemTax2 || 0, UpdatedBy, UpdatedAt, id]
    );

    return result.rows[0];
  }

  static async delete(id, DeletedBy) {
    const DeletedAt = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE invoicedetail SET deletedby = $1, deletedat = $2 WHERE invoicedetailid = $3 RETURNING *`,
      [DeletedBy, DeletedAt, id]
    );

    return result.rows[0];
  }

  static async deleteByInvoiceId(invoiceId, DeletedBy) {
    const DeletedAt = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE invoicedetail SET deletedby = $1, deletedat = $2 WHERE invoiceid = $3 RETURNING *`,
      [DeletedBy, DeletedAt, invoiceId]
    );

    return result.rows;
  }
}

module.exports = InvoiceDetail;
