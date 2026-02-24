const pool = require('../config/db');

class Vehicle {
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM vehicledetails WHERE deletedat IS NULL ORDER BY registrationnumber'
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM vehicledetails WHERE vehicleid = $1 AND deletedat IS NULL',
      [id]
    );
    return result.rows[0];
  }

  static async getByCustomerId(customerId) {
    // Join through invoicemaster to find vehicles associated with a customer
    const result = await pool.query(`
      SELECT DISTINCT vd.* 
      FROM vehicledetails vd
      INNER JOIN invoicemaster im ON vd.vehicleid = im.vehicleid
      WHERE im.customerid = $1 AND vd.deletedat IS NULL
      ORDER BY vd.registrationnumber
    `, [customerId]);
    return result.rows;
  }

  static async create(data) {
    const { RegistrationNumber, VehicleType, Manufacturer, Model, YearOfManufacture, EngineNumber, ChassisNumber, Color, CreatedBy } = data;
    const CreatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `INSERT INTO vehicledetails (registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color, createdat) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [RegistrationNumber, VehicleType, Manufacturer, Model, YearOfManufacture, EngineNumber, ChassisNumber, Color, CreatedAt]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { RegistrationNumber, VehicleType, Manufacturer, Model, YearOfManufacture, EngineNumber, ChassisNumber, Color } = data;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `UPDATE vehicledetails SET registrationnumber = $1, vehicletype = $2, manufacturer = $3, model = $4, yearofmanufacture = $5, enginenumber = $6, chassisnumber = $7, color = $8, updatedat = $9
       WHERE vehicleid = $10 AND deletedat IS NULL RETURNING *`,
      [RegistrationNumber, VehicleType, Manufacturer, Model, YearOfManufacture, EngineNumber, ChassisNumber, Color, UpdatedAt, id]
    );
    return result.rows[0];
  }

  static async getUniqueModels() {
    const result = await pool.query(
      'SELECT DISTINCT model FROM vehicledetails WHERE deletedat IS NULL AND model IS NOT NULL ORDER BY model'
    );
    return result.rows.map(row => row.model);
  }

  static async getUniqueColors(model) {
    const result = await pool.query(
      'SELECT DISTINCT color FROM vehicledetails WHERE deletedat IS NULL AND color IS NOT NULL AND model = $1 ORDER BY color',
      [model]
    );
    return result.rows.map(row => row.color);
  }
}

module.exports = Vehicle;
