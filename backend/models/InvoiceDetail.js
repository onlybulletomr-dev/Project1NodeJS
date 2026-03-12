const pool = require('../config/db');

class InvoiceDetail {
  static async getColumnSet() {
    const columnsResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'invoicedetail'`
    );

    return new Set(columnsResult.rows.map((row) => row.column_name));
  }

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

    const schemaResult = await pool.query(
      `SELECT is_identity, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'invoicedetail'
         AND column_name = 'invoicedetailid'`
    );

    const schemaInfo = schemaResult.rows[0] || {};
    const hasIdColumn = schemaResult.rows.length > 0;
    const hasAutoId = (schemaInfo.is_identity === 'YES') ||
      (schemaInfo.column_default && schemaInfo.column_default.includes('nextval'));

    // If ID column is auto-generated OR column doesn't exist in this schema, use standard insert
    if (hasAutoId || !hasIdColumn) {
      const result = await pool.query(
        `INSERT INTO invoicedetail (
          invoiceid, itemid, qty, unitprice, linediscount, linetotal, lineitemtax1, lineitemtax2, createdby, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        insertValues
      );

      return result.rows[0];
    }

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

  static async getByInvoiceId(invoiceId) {
    const columnSet = await this.getColumnSet();
    const orderByColumn = columnSet.has('invoicedetailid')
      ? 'invoicedetailid'
      : (columnSet.has('id') ? 'id' : null);

    const orderByClause = orderByColumn ? ` ORDER BY ${orderByColumn}` : '';

    // Query that joins with both itemmaster and servicemaster to get proper descriptions
    const result = await pool.query(
      `SELECT 
        id.*,
        -- Try to get from itemmaster first (for actual items)
        COALESCE(im.partnumber, sm.servicenumber, CAST(id.itemid AS VARCHAR)) as partnumber,
        COALESCE(im.partnumber, sm.servicenumber) as servicenumber,
        -- Get description from itemmaster or servicemaster
        COALESCE(
          CASE WHEN im.itemid IS NOT NULL THEN im.itemname END,
          CASE WHEN sm.serviceid IS NOT NULL THEN COALESCE(sm.description, sm.servicename) END,
          'Item ' || CAST(id.itemid AS VARCHAR)
        ) as description,
        COALESCE(im.itemname, sm.servicename) as itemname,
        -- Indicate the source
        CASE 
          WHEN im.itemid IS NOT NULL THEN 'item'
          WHEN sm.serviceid IS NOT NULL THEN 'service'
          ELSE 'unknown'
        END as source
      FROM invoicedetail id
      LEFT JOIN itemmaster im ON id.itemid = im.itemid AND im.deletedat IS NULL
      LEFT JOIN servicemaster sm ON id.itemid = sm.serviceid AND sm.deletedat IS NULL
      WHERE id.invoiceid = $1 AND id.deletedat IS NULL
      ${orderByClause}`,
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
    const columnSet = await this.getColumnSet();

    if (columnSet.has('deletedat') && columnSet.has('deletedby')) {
      const result = await pool.query(
        `UPDATE invoicedetail SET deletedby = $1, deletedat = $2 WHERE invoicedetailid = $3 RETURNING *`,
        [DeletedBy, DeletedAt, id]
      );

      return result.rows[0];
    }

    if (columnSet.has('deletedat')) {
      const result = await pool.query(
        `UPDATE invoicedetail SET deletedat = $1 WHERE invoicedetailid = $2 RETURNING *`,
        [DeletedAt, id]
      );

      return result.rows[0];
    }

    const result = await pool.query(
      `DELETE FROM invoicedetail WHERE invoicedetailid = $1 RETURNING *`,
      [id]
    );

    return result.rows[0];
  }

  static async deleteByInvoiceId(invoiceId, DeletedBy) {
    const DeletedAt = new Date().toISOString().split('T')[0];
    const columnSet = await this.getColumnSet();
    
    console.log('=== DELETEBYINVOICEID DEBUG ===');
    console.log('Invoice ID to delete from:', invoiceId);
    console.log('Available columns:', Array.from(columnSet).sort());
    console.log('Has deletedat?', columnSet.has('deletedat'));
    console.log('Has deletedby?', columnSet.has('deletedby'));

    if (columnSet.has('deletedat') && columnSet.has('deletedby')) {
      console.log('Using UPDATE with both deletedat and deletedby');
      const result = await pool.query(
        `UPDATE invoicedetail SET deletedby = $1, deletedat = $2 WHERE invoiceid = $3 RETURNING *`,
        [DeletedBy, DeletedAt, invoiceId]
      );
      console.log('Rows updated:', result.rows.length);
      return result.rows;
    }

    if (columnSet.has('deletedat')) {
      console.log('Using UPDATE with deletedat only');
      const result = await pool.query(
        `UPDATE invoicedetail SET deletedat = $1 WHERE invoiceid = $2 RETURNING *`,
        [DeletedAt, invoiceId]
      );
      console.log('Rows updated:', result.rows.length);
      return result.rows;
    }

    console.log('Using hard DELETE');
    const result = await pool.query(
      `DELETE FROM invoicedetail WHERE invoiceid = $1 RETURNING *`,
      [invoiceId]
    );
    console.log('Rows deleted:', result.rows.length);
    return result.rows;
  }

  // Hard delete for updates - avoids unique constraint conflicts with soft-deleted rows
  static async hardDeleteByInvoiceId(invoiceId) {
    console.log('=== HARD DELETE BY INVOICE ID ===');
    console.log('Invoice ID:', invoiceId);
    const result = await pool.query(
      `DELETE FROM invoicedetail WHERE invoiceid = $1 RETURNING *`,
      [invoiceId]
    );
    console.log('Rows hard-deleted:', result.rows.length);
    return result.rows;
  }
}

module.exports = InvoiceDetail;
