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
      PartNumber,
      ItemName,
    } = data;

    const CreatedAt = new Date().toISOString().split('T')[0];

    const insertValues = [InvoiceID, ItemID, Qty, UnitPrice, LineDiscount, LineTotal, LineItemTax1 || 0, LineItemTax2 || 0, CreatedBy, CreatedAt, PartNumber || null, ItemName || null];

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
          invoiceid, itemid, qty, unitprice, linediscount, linetotal, lineitemtax1, lineitemtax2, createdby, createdat, partnumber, itemname
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        insertValues
      );

      return result.rows[0];
    }

    const idResult = await pool.query('SELECT COALESCE(MAX(invoicedetailid), 0) + 1 AS nextid FROM invoicedetail');
    const nextInvoiceDetailId = idResult.rows[0].nextid;

    const fallbackResult = await pool.query(
      `INSERT INTO invoicedetail (
        invoicedetailid, invoiceid, itemid, qty, unitprice, linediscount, linetotal, lineitemtax1, lineitemtax2, createdby, createdat, partnumber, itemname
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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

    // First fetch invoice details with fallback names
    const detailsResult = await pool.query(
      `SELECT 
        id.invoicedetailid,
        id.invoiceid,
        id.itemid,
        id.qty,
        id.unitprice,
        id.linediscount,
        id.linetotal,
        id.lineitemtax1,
        id.lineitemtax2,
        id.extravar1,
        id.extravar2,
        id.extraint1,
        id.createdby,
        id.createdat,
        id.updatedby,
        id.updatedat,
        id.deletedat,
        id.deletedby,
        COALESCE(id.partnumber, CAST(id.itemid AS VARCHAR)) as partnumber,
        COALESCE(id.itemname, im.itemname, sm.servicename, 'Item ' || CAST(id.itemid AS VARCHAR)) as itemname,
        COALESCE(id.itemname, im.itemname, sm.servicename) as description
      FROM invoicedetail id
      LEFT JOIN itemmaster im ON id.itemid = im.itemid AND im.deletedat IS NULL
      LEFT JOIN servicemaster sm ON id.itemid = sm.serviceid AND sm.deletedat IS NULL
      WHERE id.invoiceid = $1 AND id.deletedat IS NULL
      ${orderByClause}`,
      [invoiceId]
    );

    // Then fetch serial numbers separately and attach to details
    const serialResult = await pool.query(
      `SELECT 
        invoicedetailid,
        string_agg(
          'SN: ' || COALESCE(serialnumber, '-') || ' | Batch: ' || COALESCE(batch, '-') || ' | Model: ' || COALESCE(model, '-') || ' | Mfg: ' || COALESCE(remarks, '-'),
          ' | '
        ) as serials_info
      FROM serialnumber
      WHERE invoicedetailid IN (SELECT invoicedetailid FROM invoicedetail WHERE invoiceid = $1 AND deletedat IS NULL)
        AND deletedat IS NULL
      GROUP BY invoicedetailid`,
      [invoiceId]
    );

    // Map serial info by invoicedetailid
    const serialMap = new Map();
    serialResult.rows.forEach(row => {
      serialMap.set(row.invoicedetailid, row.serials_info);
    });

    // Attach serial info to details
    const result = detailsResult.rows.map(row => ({
      ...row,
      serials_info: serialMap.get(row.invoicedetailid) || null
    }));

    return result;
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
