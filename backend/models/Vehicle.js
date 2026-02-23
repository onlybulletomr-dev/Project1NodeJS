const pool = require('../config/db');

class Vehicle {
  static async getAll() {
    const result = await pool.query(
      'SELECT v.*, vm.ManufacturerName, vm.ModelName FROM vehiclemaster v LEFT JOIN VehicleManufacturer vm ON v.ManufacturerID = vm.ManufacturerID WHERE v.DeletedAt IS NULL ORDER BY v.VehicleID'
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT v.*, vm.ManufacturerName, vm.ModelName FROM vehiclemaster v LEFT JOIN VehicleManufacturer vm ON v.ManufacturerID = vm.ManufacturerID WHERE v.VehicleID = $1 AND v.DeletedAt IS NULL',
      [id]
    );
    return result.rows[0];
  }

  static async getByCustomerId(customerId) {
    const result = await pool.query(
      'SELECT v.*, vm.ManufacturerName, vm.ModelName FROM vehiclemaster v LEFT JOIN VehicleManufacturer vm ON v.ManufacturerID = vm.ManufacturerID WHERE v.CustomerID = $1 AND v.DeletedAt IS NULL',
      [customerId]
    );
    return result.rows;
  }

  static async create(data) {
    const { CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, CreatedBy } = data;
    const CreatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `INSERT INTO vehiclemaster (CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, CreatedBy, CreatedAt) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, CreatedBy, CreatedAt]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, UpdatedBy } = data;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `UPDATE vehiclemaster SET CustomerID = $1, ManufacturerID = $2, RegistrationNumber = $3, Color = $4, ChassisNumber = $5, EngineNumber = $6, ManufacturingYear = $7, PurchaseDate = $8, UpdatedBy = $9, UpdatedAt = $10 
       WHERE VehicleID = $11 AND DeletedAt IS NULL RETURNING *`,
      [CustomerID, ManufacturerID, RegistrationNumber, Color, ChassisNumber, EngineNumber, ManufacturingYear, PurchaseDate, UpdatedBy, UpdatedAt, id]
    );
    return result.rows[0];
  }

  static async getUniqueModels() {
    const result = await pool.query(
      'SELECT DISTINCT modelname FROM vehiclemaster WHERE deletedat IS NULL AND modelname IS NOT NULL ORDER BY modelname'
    );
    return result.rows.map(row => row.modelname);
  }

  static async getUniqueColors(model) {
    const result = await pool.query(
      'SELECT DISTINCT color FROM vehiclemaster WHERE deletedat IS NULL AND color IS NOT NULL AND modelname = $1 ORDER BY color',
      [model]
    );
    return result.rows.map(row => row.color);
  }
}

module.exports = Vehicle;
