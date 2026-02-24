const pool = require('../config/db');

class VehicleManufacturer {
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM vehiclemanufacturer WHERE deletedat IS NULL ORDER BY manufacturername'
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM vehiclemanufacturer WHERE manufacturerid = $1 AND deletedat IS NULL',
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { ManufacturerName, ModelName, CreatedBy } = data;
    const CreatedAt = new Date().toISOString().split('T')[0];
    
    console.log('[VehicleManufacturer.create] Creating with:', { ManufacturerName, ModelName, CreatedBy, CreatedAt });
    
    const result = await pool.query(
      'INSERT INTO vehiclemanufacturer (manufacturername, modelname, createdby, createdat) VALUES ($1, $2, $3, $4) RETURNING *',
      [ManufacturerName, ModelName, CreatedBy, CreatedAt]
    );
    
    console.log('[VehicleManufacturer.create] Result:', result.rows[0]);
    return result.rows[0];
  }

  static async update(id, data) {
    const { ManufacturerName, ModelName, UpdatedBy } = data;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'UPDATE vehiclemanufacturer SET manufacturername = $1, modelname = $2, updatedby = $3, updatedat = $4 WHERE manufacturerid = $5 AND deletedat IS NULL RETURNING *',
      [ManufacturerName, ModelName, UpdatedBy, UpdatedAt, id]
    );
    return result.rows[0];
  }

  static async delete(id, data) {
    const { DeletedBy } = data;
    const DeletedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'UPDATE vehiclemanufacturer SET deletedby = $1, deletedat = $2 WHERE manufacturerid = $3 RETURNING *',
      [DeletedBy, DeletedAt, id]
    );
    return result.rows[0];
  }
}

module.exports = VehicleManufacturer;
