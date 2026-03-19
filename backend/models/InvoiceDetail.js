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
    const primaryKeyColumn = columnSet.has('invoicedetailid')
      ? 'invoicedetailid'
      : (columnSet.has('id') ? 'id' : null);

    const orderByClause = primaryKeyColumn ? ` ORDER BY ${primaryKeyColumn}` : '';

    // Check which optional columns exist
    const hasPartnumber = columnSet.has('partnumber');
    const hasItemname = columnSet.has('itemname');
    const hasExtraVar1 = columnSet.has('extravar1');
    const hasExtraVar2 = columnSet.has('extravar2');
    const hasExtraInt1 = columnSet.has('extraint1');
    const hasUpdatedby = columnSet.has('updatedby');
    const hasUpdatedat = columnSet.has('updatedat');
    const hasDeletedat = columnSet.has('deletedat');
    const hasDeletedby = columnSet.has('deletedby');

    // Build SELECT clause based on available columns
    let selectList = [
      `${primaryKeyColumn} as invoicedetailid`,
      `invoicedetail.invoiceid`,
      `invoicedetail.itemid`,
      `invoicedetail.qty`,
      `invoicedetail.unitprice`,
      `invoicedetail.linediscount`,
      `invoicedetail.linetotal`,
      `invoicedetail.lineitemtax1`,
      `invoicedetail.lineitemtax2`,
      hasExtraVar1 ? `invoicedetail.extravar1` : `NULL as extravar1`,
      hasExtraVar2 ? `invoicedetail.extravar2` : `NULL as extravar2`,
      hasExtraInt1 ? `invoicedetail.extraint1` : `NULL as extraint1`,
      `invoicedetail.createdby`,
      `invoicedetail.createdat`,
      hasUpdatedby ? `invoicedetail.updatedby` : `NULL as updatedby`,
      hasUpdatedat ? `invoicedetail.updatedat` : `NULL as updatedat`,
      hasDeletedat ? `invoicedetail.deletedat` : `NULL as deletedat`,
      hasDeletedby ? `invoicedetail.deletedby` : `NULL as deletedby`,
      hasPartnumber 
        ? `COALESCE(invoicedetail.partnumber, CAST(invoicedetail.itemid AS VARCHAR)) as partnumber`
        : `CAST(invoicedetail.itemid AS VARCHAR) as partnumber`,
      hasItemname
        ? `COALESCE(invoicedetail.itemname, im.itemname, sm.servicename, 'Item ' || CAST(invoicedetail.itemid AS VARCHAR)) as itemname`
        : `COALESCE(im.itemname, sm.servicename, 'Item ' || CAST(invoicedetail.itemid AS VARCHAR)) as itemname`,
      hasItemname
        ? `COALESCE(invoicedetail.itemname, im.itemname, sm.servicename) as description`
        : `COALESCE(im.itemname, sm.servicename) as description`
    ];

    const selectClause = `SELECT ${selectList.join(', ')}`;

    // First fetch invoice details with fallback names
    const detailsResult = await pool.query(
      `${selectClause}
      FROM invoicedetail
      LEFT JOIN itemmaster im ON invoicedetail.itemid = im.itemid AND im.deletedat IS NULL
      LEFT JOIN servicemaster sm ON invoicedetail.itemid = sm.serviceid AND sm.deletedat IS NULL
      WHERE invoicedetail.invoiceid = $1 AND invoicedetail.deletedat IS NULL
      ${orderByClause}`,
      [invoiceId]
    );

    // Check if serialnumber table exists before querying
    let serialMap = new Map();
    try {
      const tableExistsResult = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'serialnumber'`
      );
      
      if (tableExistsResult.rows.length > 0) {
        // Table exists, fetch serial numbers
        const serialResult = await pool.query(
          `SELECT 
            sn.invoicedetailid,
            string_agg(
              'SN: ' || COALESCE(sn.serialnumber, '-') || ' | Batch: ' || COALESCE(sn.batch, '-') || ' | Model: ' || COALESCE(sn.model, '-') || ' | Mfg: ' || COALESCE(sn.remarks, '-'),
              ' | '
            ) as serials_info
          FROM serialnumber sn
          WHERE sn.invoicedetailid IN (
            SELECT ${primaryKeyColumn} FROM invoicedetail WHERE invoiceid = $1 AND deletedat IS NULL
          )
            AND sn.deletedat IS NULL
          GROUP BY sn.invoicedetailid`,
          [invoiceId]
        );

        // Map serial info by invoicedetailid
        serialResult.rows.forEach(row => {
          serialMap.set(row.invoicedetailid, row.serials_info);
        });
      }
    } catch (error) {
      // If serialnumber table doesn't exist or query fails, just continue without serials
      console.log('Serial numbers not available:', error.message);
    }

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
