const pool = require('../config/db');

class ItemDetail {
  /**
   * Get item detail by ID and item ID
   */
  static async getByItemIdAndBranchId(itemId, branchId) {
    try {
      const result = await pool.query(
        `SELECT * FROM itemdetail WHERE itemid = $1 AND branchid = $2 AND deletedat IS NULL`,
        [itemId, branchId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching item detail:', error);
      throw error;
    }
  }

  /**
   * Update item detail quantity (add to existing qty)
   */
  static async updateQuantity(itemId, branchId, qtyToAdd, userId) {
    try {
      const result = await pool.query(
        `UPDATE itemdetail 
         SET quantityonhand = COALESCE(quantityonhand, 0) + $1,
             updatedby = $2,
             updatedat = NOW()
         WHERE itemid = $3 AND branchid = $4 AND deletedat IS NULL
         RETURNING *`,
        [qtyToAdd, userId, itemId, branchId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating item detail quantity:', error);
      throw error;
    }
  }

  /**
   * Create new item detail record
   */
  static async create(itemId, branchId, quantityOnHand, taxId, minStockLevel, reorderQuantity, userId) {
    try {
      const result = await pool.query(
        `INSERT INTO itemdetail 
         (itemid, branchid, quantityonhand, taxid, minstocklevel, reorderquantity, createdby, createdat)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [itemId, branchId, quantityOnHand, taxId, minStockLevel, reorderQuantity, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating item detail:', error);
      throw error;
    }
  }
}

module.exports = ItemDetail;
