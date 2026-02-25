const pool = require('../config/db');

class VehicleDetail {
  // Create a new vehicle detail
  static async create(data) {
    const { registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color } = data;
    const CreatedAt = new Date().toISOString().split('T')[0];
    
    console.log('[VehicleDetail.create] Creating vehicle:', { registrationnumber, vehicletype, manufacturer, model });
    
    const queryText = `INSERT INTO vehicledetail (registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color, createdat) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    
    const values = [registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color, CreatedAt];
    
    console.log('[VehicleDetail.create] Query:', queryText);
    
    const result = await pool.query(queryText, values);
    
    console.log('[VehicleDetail.create] Created vehicle:', result.rows[0]);
    return result.rows[0];
  }

  // Get all vehicle details
  static async getAll() {
    const result = await pool.query(
      'SELECT vehicleid, registrationnumber as vehiclenumber, vehicletype, manufacturer, model as vehiclemodel, yearofmanufacture, enginenumber, chassisnumber, color as vehiclecolor, createdat, updatedat, deletedat FROM vehicledetail WHERE deletedat IS NULL ORDER BY registrationnumber'
    );
    return result.rows;
  }

  // Get vehicle detail by ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT vehicleid, registrationnumber as vehiclenumber, vehicletype, manufacturer, model as vehiclemodel, yearofmanufacture, enginenumber, chassisnumber, color as vehiclecolor, createdat, updatedat, deletedat FROM vehicledetail WHERE vehicleid = $1 AND deletedat IS NULL',
      [id]
    );
    return result.rows;
  }

  // Get vehicle details by Customer ID (direct relationship)
  static async getByCustomerId(customerId) {
    try {
      const query = `
        SELECT 
          vehicleid,
          registrationnumber as vehiclenumber,
          vehicletype,
          manufacturer,
          model as vehiclemodel,
          yearofmanufacture,
          enginenumber,
          chassisnumber,
          color as vehiclecolor,
          createdat,
          updatedat,
          deletedat
        FROM vehicledetail
        WHERE customerid = $1 AND deletedat IS NULL
        ORDER BY registrationnumber
      `;
      console.log(`[SQL] Executing query for customer ${customerId}:`, query);
      const result = await pool.query(query, [customerId]);
      console.log(`[SQL] Result: ${result.rows.length} vehicles found`);
      return result.rows;
    } catch (error) {
      console.error(`[SQL ERROR] Failed to get vehicles for customer ${customerId}:`, error.message);
      throw error;
    }
  }

  // Update vehicle detail
  static async update(id, data) {
    const { registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color } = data;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    console.log('[VehicleDetail.update] Updating vehicle', id, 'with:', { registrationnumber, model });
    
    const result = await pool.query(
      `UPDATE vehicledetail SET registrationnumber = $1, vehicletype = $2, manufacturer = $3, model = $4, yearofmanufacture = $5, enginenumber = $6, chassisnumber = $7, color = $8, updatedat = $9 
       WHERE vehicleid = $10 AND deletedat IS NULL RETURNING *`,
      [registrationnumber, vehicletype, manufacturer, model, yearofmanufacture, enginenumber, chassisnumber, color, UpdatedAt, id]
    );
    
    console.log('[VehicleDetail.update] Updated vehicle:', result.rows[0]);
    return result.rows[0];
  }

  // Soft delete vehicle detail
  static async delete(id, DeletedBy) {
    const DeletedAt = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `UPDATE vehicledetail SET deletedat = $1 WHERE vehicleid = $2 RETURNING *`,
      [DeletedAt, id]
    );
    return result.rows[0];
  }
}

module.exports = VehicleDetail;
