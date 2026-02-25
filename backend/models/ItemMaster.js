const pool = require('../config/db');

class ItemMaster {
  static async searchByPartNumber(partnumber) {
    try {
      const result = await pool.query(
        `SELECT itemid, partnumber, itemname, uom, mrp
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
        `SELECT itemid, partnumber, itemname, uom, mrp
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
      const result = await pool.query(
        `SELECT itemid, partnumber, itemname, uom, mrp
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
}

module.exports = ItemMaster;
