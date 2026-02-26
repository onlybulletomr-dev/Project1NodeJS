const pool = require('../config/db');

class InvoiceMaster {
  static async create(data) {
    const {
      InvoiceNumber,
      BranchId,
      CustomerId,
      VehicleId,
      VehicleNumber,
      JobCardId,
      InvoiceDate,
      DueDate,
      InvoiceType,
      SubTotal,
      TotalDiscount,
      PartsIncome,
      ServiceIncome,
      Tax1,
      Tax2,
      TotalAmount,
      Technicianmain,
      Technicianassistant,
      WaterWash,
      ServiceAdvisorIn,
      ServiceAdvisorDeliver,
      TestDriver,
      Cleaner,
      AdditionalWork,
      Odometer,
      Notes,
      Notes1,
      CreatedBy,
    } = data;

    const CreatedAt = new Date().toISOString().split('T')[0];

    const insertValues = [
      InvoiceNumber, BranchId, CustomerId, VehicleId, VehicleNumber, JobCardId,
      InvoiceDate || new Date().toISOString().split('T')[0], DueDate, InvoiceType || 'Service Invoice',
      SubTotal, TotalDiscount || 0, PartsIncome || 0, ServiceIncome || 0, Tax1 || 0, Tax2 || 0, TotalAmount,
      Technicianmain, Technicianassistant, WaterWash, ServiceAdvisorIn, ServiceAdvisorDeliver,
      TestDriver, Cleaner, AdditionalWork,
      Odometer, Notes, Notes1, CreatedBy, CreatedAt,
    ];

    try {
      const result = await pool.query(
        `INSERT INTO invoicemaster (
          invoicenumber, branchid, customerid, vehicleid, vehiclenumber, jobcardid,
          invoicedate, duedate, invoicetype,
          subtotal, totaldiscount, partsincome, serviceincome, tax1, tax2, totalamount,
          technicianmain, technicianassistant, waterwash, serviceadvisorin, serviceadvisordeliver,
          testdriver, cleaner, additionalwork,
          odometer, notes, notes1, createdby, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        RETURNING *`,
        insertValues
      );

      return result.rows[0];
    } catch (error) {
      // Render compatibility: some DBs may not auto-generate invoiceid
      const isInvoiceIdNullError = /null value in column\s+"?invoiceid"?/i.test(error.message || '');
      if (isInvoiceIdNullError) {
        const idResult = await pool.query('SELECT COALESCE(MAX(invoiceid), 0) + 1 AS nextid FROM invoicemaster');
        const nextInvoiceId = idResult.rows[0].nextid;

        const fallbackResult = await pool.query(
          `INSERT INTO invoicemaster (
            invoiceid, invoicenumber, branchid, customerid, vehicleid, vehiclenumber, jobcardid,
            invoicedate, duedate, invoicetype,
            subtotal, totaldiscount, partsincome, serviceincome, tax1, tax2, totalamount,
            technicianmain, technicianassistant, waterwash, serviceadvisorin, serviceadvisordeliver,
            testdriver, cleaner, additionalwork,
            odometer, notes, notes1, createdby, createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
          RETURNING *`,
          [nextInvoiceId, ...insertValues]
        );

        return fallbackResult.rows[0];
      }

      throw error;
    }
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT * FROM invoicemaster WHERE invoiceid = $1 AND deletedat IS NULL`,
      [id]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(
      `SELECT * FROM invoicemaster WHERE deletedat IS NULL ORDER BY invoiceid DESC`
    );
    return result.rows;
  }

  static async getAllByBranch(branchId) {
    const result = await pool.query(
      `SELECT * FROM invoicemaster WHERE branchid = $1 AND deletedat IS NULL ORDER BY invoiceid DESC`,
      [branchId]
    );
    return result.rows;
  }

  static async getAllByBranchWithDetails(branchId) {
    const result = await pool.query(
      `SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.invoicedate,
        im.branchid,
        im.customerid,
        im.vehicleid,
        im.vehiclenumber,
        im.totalamount,
        im.paymentstatus,
        im.paymentdate,
        COALESCE(NULLIF(TRIM(COALESCE(cm.firstname, '') || ' ' || COALESCE(cm.lastname, '')), ''), 'N/A') as customername,
        COALESCE(SUM(pd.amount), 0) as paidamount
      FROM invoicemaster im
      LEFT JOIN customermaster cm ON im.customerid = cm.customerid AND cm.deletedat IS NULL
      LEFT JOIN paymentdetail pd ON im.invoiceid = pd.invoiceid AND pd.deletedat IS NULL
      WHERE im.branchid = $1 AND im.deletedat IS NULL
      GROUP BY im.invoiceid, im.invoicenumber, im.invoicedate, im.branchid, im.customerid, im.vehicleid, 
               im.vehiclenumber, im.totalamount, im.paymentstatus, im.paymentdate, cm.firstname, cm.lastname
      ORDER BY im.invoicedate DESC`,
      [branchId]
    );
    return result.rows;
  }

  static async update(id, data) {
    const {
      InvoiceNumber,
      BranchId,
      CustomerId,
      VehicleId,
      JobCardId,
      InvoiceDate,
      DueDate,
      InvoiceType,
      SubTotal,
      TotalDiscount,
      PartsIncome,
      ServiceIncome,
      Tax1,
      Tax2,
      TotalAmount,
      Technicianmain,
      Technicianassistant,
      WaterWash,
      ServiceAdvisorIn,
      ServiceAdvisorDeliver,
      TestDriver,
      Cleaner,
      AdditionalWork,
      Odometer,
      Notes,
      Notes1,
      UpdatedBy,
    } = data;

    const UpdatedAt = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE invoicemaster SET
        invoicenumber = $1, branchid = $2, customerid = $3, vehicleid = $4, jobcardid = $5,
        invoicedate = $6, duedate = $7, invoicetype = $8,
        subtotal = $9, totaldiscount = $10, partsincome = $11, serviceincome = $12, tax1 = $13, tax2 = $14, totalamount = $15,
        technicianmain = $16, technicianassistant = $17, waterwash = $18, serviceadvisorin = $19, serviceadvisordeliver = $20,
        testdriver = $21, cleaner = $22, additionalwork = $23,
        odometer = $24, notes = $25, notes1 = $26, updatedby = $27, updatedat = $28
      WHERE invoiceid = $29 AND deletedat IS NULL
      RETURNING *`,
      [
        InvoiceNumber, BranchId, CustomerId, VehicleId, JobCardId,
        InvoiceDate, DueDate, InvoiceType,
        SubTotal, TotalDiscount, PartsIncome, ServiceIncome, Tax1, Tax2, TotalAmount,
        Technicianmain, Technicianassistant, WaterWash, ServiceAdvisorIn, ServiceAdvisorDeliver,
        TestDriver, Cleaner, AdditionalWork,
        Odometer, Notes, Notes1, UpdatedBy, UpdatedAt, id,
      ]
    );

    return result.rows[0];
  }

  static async delete(id, DeletedBy) {
    const DeletedAt = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE invoicemaster SET deletedby = $1, deletedat = $2 WHERE invoiceid = $3 RETURNING *`,
      [DeletedBy, DeletedAt, id]
    );

    return result.rows[0];
  }
}

module.exports = InvoiceMaster;
