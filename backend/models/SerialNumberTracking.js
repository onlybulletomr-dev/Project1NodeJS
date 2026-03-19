const pool = require('../config/db');

/**
 * SerialNumberTracking Model
 * Manages per-branch configuration for serial number tracking
 * Finalized fields: itemid, branchid, enabled, and audit trail
 */

class SerialNumberTracking {
  /**
   * Create a new serial number tracking configuration
   * @param {object} data - { itemid, branchid, enabled, createdby }
   */
  static async create(data) {
    const {
      itemid,
      branchid,
      enabled = true,
      createdby
    } = data;

    try {
      const result = await pool.query(
        `INSERT INTO serialnumbertracking 
         (itemid, branchid, enabled, createdby)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [itemid, branchid, enabled, createdby]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating serial number tracking config:', error);
      throw error;
    }
  }

  /**
   * Get tracking config by ID
   */
  static async getById(trackingId) {
    try {
      const result = await pool.query(
        `SELECT * FROM serialnumbertracking 
         WHERE serialnumbertrackingid = $1 AND deletedat IS NULL`,
        [trackingId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching serial number tracking config:', error);
      throw error;
    }
  }

  /**
   * Get tracking config for specific item and branch
   */
  static async getByItemAndBranch(itemId, branchId) {
    try {
      const result = await pool.query(
        `SELECT * FROM serialnumbertracking 
         WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL`,
        [itemId, branchId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching serial number tracking config:', error);
      throw error;
    }
  }

  /**
   * Get all items with serial tracking enabled in a branch
   */
  static async getEnabledByBranch(branchId) {
    try {
      const result = await pool.query(
        `SELECT snt.*, im.itemid, im.partnumber, im.itemname 
         FROM serialnumbertracking snt
         JOIN itemmaster im ON snt.itemid = im.itemid
         WHERE snt.branchid = $1 AND snt.enabled = TRUE AND snt.deletedat IS NULL
         ORDER BY im.itemname`,
        [branchId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching items with serial tracking enabled:', error);
      throw error;
    }
  }

  /**
   * Get all tracking configurations for a branch
   */
  static async getAll(branchId) {
    try {
      const result = await pool.query(
        `SELECT snt.*, im.itemid, im.partnumber, im.itemname 
         FROM serialnumbertracking snt
         JOIN itemmaster im ON snt.itemid = im.itemid
         WHERE snt.branchid = $1 AND snt.deletedat IS NULL
         ORDER BY im.partnumber`,
        [branchId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all serial number tracking configs:', error);
      throw error;
    }
  }

  /**
   * Update tracking configuration
   */
  static async update(trackingId, data) {
    const { enabled, updatedby } = data;

    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (enabled !== undefined) {
        updateFields.push(`enabled = $${paramIndex}`);
        updateValues.push(enabled);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
      updateFields.push(`updatedby = $${paramIndex}`);
      updateValues.push(updatedby);
      paramIndex++;

      const query = `
        UPDATE serialnumbertracking 
        SET ${updateFields.join(', ')}
        WHERE serialnumbertrackingid = $${paramIndex} AND deletedat IS NULL
        RETURNING *
      `;
      updateValues.push(trackingId);

      const result = await pool.query(query, updateValues);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating serial number tracking config:', error);
      throw error;
    }
  }

  /**
   * Enable serial tracking for an item
   */
  static async enable(itemId, branchId, updatedby) {
    try {
      const result = await pool.query(
        `UPDATE serialnumbertracking 
         SET enabled = TRUE, updatedat = CURRENT_TIMESTAMP, updatedby = $3
         WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL
         RETURNING *`,
        [itemId, branchId, updatedby]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error enabling serial tracking:', error);
      throw error;
    }
  }

  /**
   * Disable serial tracking for an item
   */
  static async disable(itemId, branchId, updatedby) {
    try {
      const result = await pool.query(
        `UPDATE serialnumbertracking 
         SET enabled = FALSE, updatedat = CURRENT_TIMESTAMP, updatedby = $3
         WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL
         RETURNING *`,
        [itemId, branchId, updatedby]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error disabling serial tracking:', error);
      throw error;
    }
  }

  /**
   * Soft delete tracking configuration
   */
  static async delete(trackingId, updatedby) {
    try {
      const result = await pool.query(
        `UPDATE serialnumbertracking 
         SET deletedat = CURRENT_TIMESTAMP, updatedby = $2
         WHERE serialnumbertrackingid = $1
         RETURNING *`,
        [trackingId, updatedby]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting serial number tracking config:', error);
      throw error;
    }
  }

  /**
   * Get tracking summary for a branch
   */
  static async getSummary(branchId) {
    try {
      const result = await pool.query(
        `SELECT 
           COUNT(*) as total_tracked,
           SUM(CASE WHEN enabled = TRUE THEN 1 ELSE 0 END) as items_enabled
         FROM serialnumbertracking
         WHERE branchid = $1 AND deletedat IS NULL`,
        [branchId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching serial number tracking summary:', error);
      throw error;
    }
  }
}

module.exports = SerialNumberTracking;
