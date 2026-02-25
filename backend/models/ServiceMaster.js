const pool = require('../config/db');

class ServiceMaster {
  static async searchByServiceName(servicename) {
    try {
      const result = await pool.query(
        `SELECT serviceid, servicename, description, defaultrate
         FROM ServiceMaster 
         WHERE (servicename ILIKE $1 OR description ILIKE $1)
         AND deletedat IS NULL
         LIMIT 20`,
        [`%${servicename}%`]
      );
      return result.rows;
    } catch (error) {
      console.error('Error searching services by name:', error);
      throw error;
    }
  }

  static async getById(serviceId) {
    try {
      const result = await pool.query(
        `SELECT * FROM ServiceMaster 
         WHERE serviceid = $1 AND deletedat IS NULL`,
        [serviceId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const result = await pool.query(
        `SELECT serviceid, servicename, description, defaultrate
         FROM ServiceMaster 
         WHERE deletedat IS NULL 
         ORDER BY servicename`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all services:', error);
      throw error;
    }
  }
}

module.exports = ServiceMaster;
