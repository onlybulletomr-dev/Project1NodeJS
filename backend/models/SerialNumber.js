const pool = require('../config/db');

class SerialNumber {
  /**
   * Create a new serial number record for an item
   */
  static async create(data) {
    const {
      itemid,
      serialnumber,
      branchid,
      invoicedetailid = null,
      vendorid = null,
      mrp = null,
      manufacturingdate = null,
      status = 'SHELF',
      remarks = null,
      createdby,
    } = data;

    try {
      const result = await pool.query(
        `INSERT INTO serialnumber (
          itemid, invoicedetailid, serialnumber, branchid, vendorid, mrp, 
          manufacturingdate, status, remarks, createdby, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING *`,
        [itemid, invoicedetailid, serialnumber, branchid, vendorid, mrp, 
         manufacturingdate, status, remarks, createdby]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`Serial number '${serialnumber}' already exists for this item in this branch`);
      }
      console.error('Error creating serial number:', error);
      throw error;
    }
  }

  /**
   * Get serial number by ID
   */
  static async getById(serialNumberId) {
    try {
      const result = await pool.query(
        `SELECT sn.*, im.itemname, im.partnumber
         FROM serialnumber sn
         JOIN itemmaster im ON sn.itemid = im.itemid
         WHERE sn.serialnumberid = $1 AND sn.deletedat IS NULL`,
        [serialNumberId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching serial number:', error);
      throw error;
    }
  }

  /**
   * Get all serial numbers for an item in a branch
   */
  static async getByItemAndBranch(itemId, branchId) {
    try {
      const result = await pool.query(
        `SELECT sn.*, im.itemname, im.partnumber
         FROM serialnumber sn
         JOIN itemmaster im ON sn.itemid = im.itemid
         WHERE sn.itemid = $1 AND sn.branchid = $2 AND sn.deletedat IS NULL
         ORDER BY sn.createdat DESC`,
        [itemId, branchId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching serial numbers:', error);
      throw error;
    }
  }

  /**
   * Check if serial number exists for an item
   */
  static async exists(itemId, serialNumber, branchId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM serialnumber
         WHERE itemid = $1 AND serialnumber = $2 AND branchid = $3 AND deletedat IS NULL`,
        [itemId, serialNumber, branchId]
      );

      return result.rows[0].count > 0;
    } catch (error) {
      console.error('Error checking serial number existence:', error);
      throw error;
    }
  }

  /**
   * Get serial number by serial number string
   */
  static async getBySerialNumber(serialNumber, branchId) {
    try {
      const result = await pool.query(
        `SELECT sn.*, im.itemname, im.partnumber
         FROM serialnumber sn
         JOIN itemmaster im ON sn.itemid = im.itemid
         WHERE sn.serialnumber = $1 AND sn.branchid = $2 AND sn.deletedat IS NULL`,
        [serialNumber, branchId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching by serial number string:', error);
      throw error;
    }
  }

  /**
   * Update serial number
   */
  static async update(serialNumberId, data) {
    const { remarks, status, updatedby } = data;

    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (remarks !== undefined) {
        updateFields.push(`remarks = $${paramIndex}`);
        updateValues.push(remarks);
        paramIndex++;
      }

      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(status);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updatedby = $${paramIndex}`);
      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
      updateValues.push(updatedby);

      const query = `
        UPDATE serialnumber 
        SET ${updateFields.join(', ')}
        WHERE serialnumberid = $${paramIndex + 1} AND deletedat IS NULL
        RETURNING *
      `;

      updateValues.push(serialNumberId);

      const result = await pool.query(query, updateValues);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating serial number:', error);
      throw error;
    }
  }

  /**
   * Update status of serial number
   */
  static async updateStatus(serialNumberId, newStatus, updatedby) {
    const validStatuses = ['SHELF', 'INVOICED', 'RETURNED', 'SCRAPED'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    try {
      const result = await pool.query(
        `UPDATE serialnumber 
         SET status = $1, updatedby = $2, updatedat = CURRENT_TIMESTAMP
         WHERE serialnumberid = $3 AND deletedat IS NULL
         RETURNING *`,
        [newStatus, updatedby, serialNumberId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error updating serial number status:', error);
      throw error;
    }
  }

  /**
   * Get serial numbers by status
   */
  static async getByStatus(status, branchId, itemId = null) {
    try {
      let query = `
        SELECT sn.*, im.itemname, im.partnumber
        FROM serialnumber sn
        JOIN itemmaster im ON sn.itemid = im.itemid
        WHERE sn.status = $1 AND sn.branchid = $2 AND sn.deletedat IS NULL
      `;

      const params = [status, branchId];
      let paramIndex = 3;

      if (itemId) {
        query += ` AND sn.itemid = $${paramIndex}`;
        params.push(itemId);
      }

      query += ` ORDER BY sn.createdat DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching by status:', error);
      throw error;
    }
  }

  /**
   * Get serial numbers by vendor
   */
  static async getByVendor(vendorId, branchId, itemId = null) {
    try {
      let query = `
        SELECT sn.*, im.itemname, im.partnumber
        FROM serialnumber sn
        JOIN itemmaster im ON sn.itemid = im.itemid
        WHERE sn.vendorid = $1 AND sn.branchid = $2 AND sn.deletedat IS NULL
      `;

      const params = [vendorId, branchId];
      let paramIndex = 3;

      if (itemId) {
        query += ` AND sn.itemid = $${paramIndex}`;
        params.push(itemId);
      }

      query += ` ORDER BY sn.createdat DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching by vendor:', error);
      throw error;
    }
  }

  /**
   * Soft delete serial number
   */
  static async delete(serialNumberId, deletedby) {
    try {
      const result = await pool.query(
        `UPDATE serialnumber 
         SET deletedat = CURRENT_TIMESTAMP, updatedby = $1
         WHERE serialnumberid = $2
         RETURNING *`,
        [deletedby, serialNumberId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error deleting serial number:', error);
      throw error;
    }
  }

  /**
   * Get serial numbers by invoice detail ID
   */
  static async getByInvoiceDetail(invoiceDetailId) {
    try {
      const result = await pool.query(
        `SELECT sn.*, im.itemname, im.partnumber
         FROM serialnumber sn
         JOIN itemmaster im ON sn.itemid = im.itemid
         WHERE sn.invoicedetailid = $1 AND sn.deletedat IS NULL`,
        [invoiceDetailId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching serial numbers by invoice detail:', error);
      throw error;
    }
  }

  /**
   * Get serial number report (for analytics/reporting)
   */
  static async getReport(branchId, itemId = null, dateFrom = null, dateTo = null, status = null, vendorId = null) {
    try {
      let query = `
        SELECT 
          sn.serialnumberid,
          sn.serialnumber,
          sn.itemid,
          im.itemname,
          im.partnumber,
          sn.branchid,
          sn.vendorid,
          cm.branchname as vendor_name,
          sn.mrp,
          TO_CHAR(sn.manufacturingdate, 'YYYY-MM-DD') as manufacturingdate,
          sn.status,
          sn.invoicedetailid,
          TO_CHAR(sn.createdat, 'YYYY-MM-DD') as dateadded,
          em.employeename as createdby_name,
          sn.remarks
        FROM serialnumber sn
        JOIN itemmaster im ON sn.itemid = im.itemid
        LEFT JOIN employeemaster em ON sn.createdby = em.employeeid
        LEFT JOIN companymaster cm ON sn.vendorid = cm.branchid
        WHERE sn.branchid = $1 AND sn.deletedat IS NULL
      `;

      const params = [branchId];
      let paramIndex = 2;

      if (itemId) {
        query += ` AND sn.itemid = $${paramIndex}`;
        params.push(itemId);
        paramIndex++;
      }

      if (status) {
        query += ` AND sn.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (vendorId) {
        query += ` AND sn.vendorid = $${paramIndex}`;
        params.push(vendorId);
        paramIndex++;
      }

      if (dateFrom) {
        query += ` AND sn.createdat >= $${paramIndex}::DATE`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND sn.createdat <= $${paramIndex}::DATE`;
        params.push(dateTo);
        paramIndex++;
      }

      query += ` ORDER BY sn.createdat DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error generating serial number report:', error);
      throw error;
    }
  }
}

module.exports = SerialNumber;
