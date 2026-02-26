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
    try {
      // Try Render schema first
      let result = await pool.query(
        'SELECT vehicleid, customerid, registrationnumber as vehiclenumber, vehicletype, manufacturer, model as vehiclemodel, yearofmanufacture, enginenumber, chassisnumber, color as vehiclecolor, createdat, updatedat, deletedat FROM vehicledetail WHERE deletedat IS NULL ORDER BY registrationnumber'
      );
      return result.rows;
    } catch (renderError) {
      // Fall back to local schema
      try {
        const result = await pool.query(
          'SELECT vehicledetailid as vehicleid, customerid, vehiclenumber as vehiclenumber, null as vehicletype, null as manufacturer, vehiclemodel as vehiclemodel, null as yearofmanufacture, null as enginenumber, null as chassisnumber, vehiclecolor as vehiclecolor, createdat, updatedat, deletedat FROM vehicledetail WHERE deletedat IS NULL ORDER BY vehiclenumber'
        );
        return result.rows;
      } catch (localError) {
        throw localError;
      }
    }
  }

  // Get vehicle detail by ID
  static async getById(id) {
    try {
      // Try Render schema first
      let result = await pool.query(
        'SELECT vehicleid, registrationnumber as vehiclenumber, vehicletype, manufacturer, model as vehiclemodel, yearofmanufacture, enginenumber, chassisnumber, color as vehiclecolor, createdat, updatedat, deletedat FROM vehicledetail WHERE vehicleid = $1 AND deletedat IS NULL',
        [id]
      );
      return result.rows;
    } catch (renderError) {
      // Fall back to local schema
      try {
        const result = await pool.query(
          'SELECT vehicledetailid as vehicleid, vehiclenumber as vehiclenumber, null as vehicletype, null as manufacturer, vehiclemodel as vehiclemodel, null as yearofmanufacture, null as enginenumber, null as chassisnumber, vehiclecolor as vehiclecolor, createdat, updatedat, deletedat FROM vehicledetail WHERE vehicledetailid = $1 AND deletedat IS NULL',
          [id]
        );
        return result.rows;
      } catch (localError) {
        throw localError;
      }
    }
  }

  // Get vehicle details by Customer ID (direct relationship, handles both local and Render schemas)
  static async getByCustomerId(customerId) {
    try {
      // Try Render schema first (vehicleid, registrationnumber, model, color)
      let query = `
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
      let result = await pool.query(query, [customerId]);
      console.log(`[SQL] Result: ${result.rows.length} vehicles found (Render schema)`);
      return result.rows;
    } catch (renderError) {
      // If Render schema fails, try local schema (vehicledetailid, vehiclenumber, vehiclemodel, vehiclecolor)
      try {
        console.log('[SQL] Render schema failed, trying local schema...');
        const query = `
          SELECT 
            vehicledetailid as vehicleid,
            vehiclenumber as vehiclenumber,
            null as vehicletype,
            null as manufacturer,
            vehiclemodel as vehiclemodel,
            null as yearofmanufacture,
            null as enginenumber,
            null as chassisnumber,
            vehiclecolor as vehiclecolor,
            createdat,
            updatedat,
            deletedat
          FROM vehicledetail
          WHERE customerid = $1 AND deletedat IS NULL
          ORDER BY vehiclenumber
        `;
        console.log(`[SQL] Executing query for customer ${customerId} (local schema):`, query);
        const result = await pool.query(query, [customerId]);
        console.log(`[SQL] Result: ${result.rows.length} vehicles found (local schema)`);
        return result.rows;
      } catch (localError) {
        console.error(`[SQL ERROR] Both schemas failed for customer ${customerId}`);
        throw localError;
      }
    }
  }

  // Update vehicle detail
  static async update(id, data) {
    const registrationnumber = data.registrationnumber || data.RegistrationNumber || null;
    const model = data.model || data.VehicleModel || null;
    const color = data.color || data.Color || null;
    const UpdatedAt = new Date().toISOString().split('T')[0];
    
    console.log('[VehicleDetail.update] Updating vehicle', id, 'with:', { registrationnumber, model });

    try {
      const result = await pool.query(
        `UPDATE vehicledetail
         SET registrationnumber = $1, model = $2, color = $3, updatedat = $4
         WHERE vehicleid = $5 AND deletedat IS NULL
         RETURNING *`,
        [registrationnumber, model, color, UpdatedAt, id]
      );

      console.log('[VehicleDetail.update] Updated vehicle (Render schema):', result.rows[0]);
      return result.rows[0];
    } catch (renderError) {
      const result = await pool.query(
        `UPDATE vehicledetail
         SET vehiclenumber = $1, vehiclemodel = $2, vehiclecolor = $3, updatedat = $4
         WHERE vehicledetailid = $5 AND deletedat IS NULL
         RETURNING *`,
        [registrationnumber, model, color, UpdatedAt, id]
      );

      console.log('[VehicleDetail.update] Updated vehicle (local schema):', result.rows[0]);
      return result.rows[0];
    }
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
