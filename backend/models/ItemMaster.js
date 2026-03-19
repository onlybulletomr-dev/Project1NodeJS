const pool = require('../config/db');

class ItemMaster {
  static async searchByPartNumber(partnumber) {
    try {
      const result = await pool.query(
        `SELECT itemid, partnumber, itemname, uom, mrp, points, duplicateserialnumber, serialnumbertracking
         FROM itemmaster 
         WHERE (partnumber ILIKE $1 OR itemname ILIKE $1)
         AND deletedat IS NULL
         LIMIT 20`,
        [`%${partnumber}%`]
      );
      return result.rows;
    } catch (error) {
      console.error('Error searching items by part number:', error);
      throw error;
    }
  }

  static async getById(itemId) {
    try {
      const result = await pool.query(
        `SELECT * FROM itemmaster 
         WHERE itemid = $1 AND deletedat IS NULL`,
        [itemId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  }

  static async getByPartNumber(partnumber) {
    try {
      const result = await pool.query(
        `SELECT itemid, partnumber, itemname, uom, mrp, points, duplicateserialnumber, serialnumbertracking
         FROM itemmaster 
         WHERE partnumber = $1 AND deletedat IS NULL`,
        [partnumber]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching item by part number:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      // Check which columns exist
      const columnsResult = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'itemmaster'`
      );
      const columns = new Set(columnsResult.rows.map(row => row.column_name));
      
      const pointsColumn = columns.has('points') ? 'points' : 'NULL as points';
      const duplicateSerialColumn = columns.has('duplicateserialnumber') ? 'duplicateserialnumber' : 'NULL as duplicateserialnumber';
      
      const result = await pool.query(
        `SELECT itemid, partnumber, itemname, uom, mrp, ${pointsColumn}, ${duplicateSerialColumn}, serialnumbertracking
         FROM itemmaster 
         WHERE deletedat IS NULL 
         ORDER BY partnumber`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all items:', error);
      throw error;
    }
  }

  /**
   * Update serial number configuration for an item
   * @param {number} itemId - Item ID
   * @param {object} data - { duplicateserialnumber, updatedby }
   */
  static async updateSerialNumberConfig(itemId, data) {
    const { duplicateserialnumber, updatedby } = data;

    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (duplicateserialnumber !== undefined) {
        updateFields.push(`duplicateserialnumber = $${paramIndex}`);
        updateValues.push(duplicateserialnumber);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
      updateFields.push(`updatedby = $${paramIndex}`);
      updateValues.push(updatedby);

      const query = `
        UPDATE itemmaster 
        SET ${updateFields.join(', ')}
        WHERE itemid = $${paramIndex + 1} AND deletedat IS NULL
        RETURNING *
      `;

      updateValues.push(itemId);

      const result = await pool.query(query, updateValues);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating serial number configuration:', error);
      throw error;
    }
  }

  /**
   * Get items that require serial numbers (serialnumbertracking = true)
   */
  static async getSerialNumberRequiredItems() {
    try {
      const result = await pool.query(
        `SELECT itemid, partnumber, itemname, serialnumbertracking, duplicateserialnumber, points
         FROM itemmaster 
         WHERE serialnumbertracking = TRUE AND deletedat IS NULL 
         ORDER BY partnumber`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching serial number required items:', error);
      throw error;
    }
  }

  /**
   * Check if item has serial number tracking enabled
   */
  static async hasSerialNumberTracking(itemId) {
    try {
      const result = await pool.query(
        `SELECT serialnumbertracking 
         FROM itemmaster 
         WHERE itemid = $1 AND deletedat IS NULL`,
        [itemId]
      );
      return result.rows[0]?.serialnumbertracking || false;
    } catch (error) {
      console.error('Error checking serial number tracking:', error);
      throw error;
    }
  }

  /**
   * Check if item allows duplicate serial numbers
   */
  static async allowsDuplicateSerialNumbers(itemId) {
    try {
      const result = await pool.query(
        `SELECT duplicateserialnumber 
         FROM itemmaster 
         WHERE itemid = $1 AND deletedat IS NULL`,
        [itemId]
      );
      return result.rows[0]?.duplicateserialnumber || false;
    } catch (error) {
      console.error('Error checking duplicate serial number allowance:', error);
      throw error;
    }
  }

  /**
   * Get points for an item
   */
  static async getPoints(itemId) {
    try {
      const result = await pool.query(
        `SELECT points FROM itemmaster WHERE itemid = $1 AND deletedat IS NULL`,
        [itemId]
      );
      return result.rows[0]?.points || 0;
    } catch (error) {
      console.error('Error getting item points:', error);
      throw error;
    }
  }
}

module.exports = ItemMaster;
