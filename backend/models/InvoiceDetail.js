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

    const result = await pool.query(
      `INSERT INTO invoicedetail (
        invoiceid, itemid, qty, unitprice, linediscount, linetotal, lineitemtax1, lineitemtax2, createdby, createdat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [InvoiceID, ItemID, Qty, UnitPrice, LineDiscount, LineTotal, LineItemTax1 || 0, LineItemTax2 || 0, CreatedBy, CreatedAt]
    );

    return result.rows[0];
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
