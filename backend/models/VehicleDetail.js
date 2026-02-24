const pool = require('../config/db');

class VehicleDetail {
  // Create a new vehicle detail
  static async create(data) {
    const { CustomerID, RegistrationNumber, VehicleModel, Color, CreatedBy } = data;
    const CreatedAt = new Date().toISOString().split('T')[0];
    
    console.log('[VehicleDetail.create] Input data:', JSON.stringify(data, null, 2));
    console.log('[VehicleDetail.create] Parameters:');
    console.log('  CustomerID:', CustomerID, 'Type:', typeof CustomerID);
    console.log('  RegistrationNumber:', RegistrationNumber, 'Type:', typeof RegistrationNumber);
    console.log('  VehicleModel:', VehicleModel, 'Type:', typeof VehicleModel);
    console.log('  Color:', Color, 'Type:', typeof Color);
    console.log('  CreatedBy:', CreatedBy, 'Type:', typeof CreatedBy);
    console.log('  CreatedAt:', CreatedAt);
    
    const queryText = `INSERT INTO vehicledetail (customerid, vehiclenumber, vehiclemodel, vehiclecolor, createdby, createdat) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    
    const values = [CustomerID, RegistrationNumber, VehicleModel, Color, CreatedBy, CreatedAt];
    
    console.log('[VehicleDetail.create] Query values:', JSON.stringify(values, null, 2));
    console.log('[VehicleDetail.create] Query:', queryText);
    
    const result = await pool.query(queryText, values);
    
    console.log('[VehicleDetail.create] Result:', JSON.stringify(result.rows[0], null, 2));
    return result.rows[0];
  }

  // Get all vehicle details
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM vehicledetails WHERE deletedat IS NULL ORDER BY registrationnumber'
    );
    return result.rows;
  }

  // Get vehicle detail by ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM vehicledetails WHERE vehicleid = $1 AND deletedat IS NULL',
      [id]
    );
    return result.rows;
  }

  // Get vehicle details by Customer ID (join through invoicemaster)
  static async getByCustomerId(customerId) {
    const result = await pool.query(`
      SELECT DISTINCT vd.* 
      FROM vehicledetails vd
      INNER JOIN invoicemaster im ON vd.vehicleid = im.vehicleid
      WHERE im.customerid = $1 AND vd.deletedat IS NULL
      ORDER BY vd.registrationnumber
    `, [customerId]);
    return result.rows;
  }

  // Update vehicle detail
  static async update(id, data) {
    const { RegistrationNumber, VehicleModel, Color, UpdatedBy } = data;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `UPDATE vehicledetail SET vehiclenumber = $1, vehiclemodel = $2, vehiclecolor = $3, updatedby = $4, updatedat = $5 
       WHERE vehicledetailid = $6 AND deletedat IS NULL RETURNING *`,
      [RegistrationNumber, VehicleModel, Color, UpdatedBy, UpdatedAt, id]
    );
    return result.rows[0];
  }

  // Soft delete vehicle detail
  static async delete(id, DeletedBy) {
    const DeletedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `UPDATE vehicledetail SET deletedby = $1, deletedat = $2 WHERE customerid = $3 RETURNING *`,
      [DeletedBy, DeletedAt, id]
    );
    return result.rows[0];
  }
}

module.exports = VehicleDetail;
