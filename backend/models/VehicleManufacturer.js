const pool = require('../config/db');

class VehicleManufacturer {
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM VehicleManufacturer WHERE DeletedAt IS NULL ORDER BY ManufacturerName'
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM VehicleManufacturer WHERE ManufacturerID = $1 AND DeletedAt IS NULL',
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { ManufacturerName, ModelName, CreatedBy } = data;
    const CreatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'INSERT INTO VehicleManufacturer (ManufacturerName, ModelName, CreatedBy, CreatedAt) VALUES ($1, $2, $3, $4) RETURNING *',
      [ManufacturerName, ModelName, CreatedBy, CreatedAt]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { ManufacturerName, ModelName, UpdatedBy } = data;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'UPDATE VehicleManufacturer SET ManufacturerName = $1, ModelName = $2, UpdatedBy = $3, UpdatedAt = $4 WHERE ManufacturerID = $5 AND DeletedAt IS NULL RETURNING *',
      [ManufacturerName, ModelName, UpdatedBy, UpdatedAt, id]
    );
    return result.rows[0];
  }

  static async delete(id, data) {
    const { DeletedBy } = data;
    const DeletedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'UPDATE VehicleManufacturer SET DeletedBy = $1, DeletedAt = $2 WHERE ManufacturerID = $3 RETURNING *',
      [DeletedBy, DeletedAt, id]
    );
    return result.rows[0];
  }
}

module.exports = VehicleManufacturer;
