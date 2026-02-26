const pool = require('../config/db');

class CustomerMaster {
  // Create a new customer
  static async create(data) {
    const {
      FirstName,
      LastName,
      EmailAddress,
      GSTNumber,
      LoyalityPoints,
      IsActive,
      MarketingConsent,
      Profession,
      Gender,
      DateOfBirth,
      DateOfMarriage,
      AddressLine1,
      AddressLine2,
      City,
      State,
      PostalCode,
      MobileNumber1,
      MobileNumber2,
      ExtraVar1,
      ExtraVar2,
      ExtraInt1,
      CreatedBy,
      CreatedAt: providedCreatedAt,
      BranchID,
    } = data;
    
    // Generate CreatedAt if not provided (required field)
    const CreatedAt = providedCreatedAt || new Date().toISOString().split('T')[0];

    const values = [
      FirstName || null, 
      LastName || null, 
      EmailAddress || null, 
      GSTNumber || null, 
      LoyalityPoints ? parseFloat(LoyalityPoints) : null,
      IsActive !== undefined && IsActive !== '' ? IsActive : true, 
      MarketingConsent !== undefined && MarketingConsent !== '' ? MarketingConsent : false, 
      Profession || null, 
      Gender || null, 
      DateOfBirth || null, 
      DateOfMarriage || null,
      AddressLine1 || null, 
      AddressLine2 || null, 
      City || null, 
      State || null, 
      PostalCode || null,
      MobileNumber1 || null, 
      MobileNumber2 || null, 
      ExtraVar1 || null, 
      ExtraVar2 || null, 
      ExtraInt1 ? parseInt(ExtraInt1) : null,
      CreatedBy || 1, 
      CreatedAt,
      BranchID || 1,
    ];

    const standardInsertQuery = `
      INSERT INTO CustomerMaster (
        FirstName, LastName, EmailAddress, GSTNumber, LoyalityPoints,
        IsActive, MarketingConsent, Profession, Gender, DateOfBirth, DateOfMarriage,
        AddressLine1, AddressLine2, City, State, PostalCode,
        MobileNumber1, MobileNumber2,
        ExtraVar1, ExtraVar2, ExtraInt1,
        CreatedBy, CreatedAt, BranchID
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *;
    `;

    try {
      const schemaResult = await pool.query(
        `SELECT is_identity, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'customermaster'
           AND column_name = 'customerid'`
      );

      const schemaInfo = schemaResult.rows[0] || {};
      const hasIdColumn = schemaResult.rows.length > 0;
      const hasAutoId = (schemaInfo.is_identity === 'YES') ||
        (schemaInfo.column_default && schemaInfo.column_default.includes('nextval'));

      console.log('[CustomerMaster.create] hasAutoId:', hasAutoId, 'hasIdColumn:', hasIdColumn);

      let result;
      if (hasAutoId || !hasIdColumn) {
        result = await pool.query(standardInsertQuery, values);
      } else {
        const idResult = await pool.query('SELECT COALESCE(MAX(customerid), 0) + 1 AS nextid FROM customermaster');
        const nextCustomerId = idResult.rows[0].nextid;

        const fallbackInsertQuery = `
          INSERT INTO CustomerMaster (
            CustomerID,
            FirstName, LastName, EmailAddress, GSTNumber, LoyalityPoints,
            IsActive, MarketingConsent, Profession, Gender, DateOfBirth, DateOfMarriage,
            AddressLine1, AddressLine2, City, State, PostalCode,
            MobileNumber1, MobileNumber2,
            ExtraVar1, ExtraVar2, ExtraInt1,
            CreatedBy, CreatedAt, BranchID
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          RETURNING *;
        `;

        result = await pool.query(fallbackInsertQuery, [nextCustomerId, ...values]);
      }

      console.log('[CustomerMaster.create] Query result:', result.rows[0]);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      console.error('[CustomerMaster.create] Query error:', error.message);
      throw error;
    }
  }

  // Format row to convert lowercase PostgreSQL columns to CamelCase
  static formatRow(row) {
    if (!row) return row;
    return {
      CustomerID: row.customerid,
      FirstName: row.firstname,
      LastName: row.lastname,
      EmailAddress: row.emailaddress,
      GSTNumber: row.gstnumber,
      LoyalityPoints: row.loyalitypoints,
      IsActive: row.isactive,
      MarketingConsent: row.marketingconsent,
      Profession: row.profession,
      Gender: row.gender,
      DateOfBirth: row.dateofbirth,
      DateOfMarriage: row.dateofmarriage,
      AddressLine1: row.addressline1,
      AddressLine2: row.addressline2,
      City: row.city,
      State: row.state,
      PostalCode: row.postalcode,
      MobileNumber1: row.mobilenumber1,
      MobileNumber2: row.mobilenumber2,
      ExtraVar1: row.extravar1,
      ExtraVar2: row.extravar2,
      ExtraInt1: row.extraint1,
      BranchID: row.branchid,
      CreatedBy: row.createdby,
      CreatedAt: row.createdat,
      UpdatedBy: row.updatedby,
      UpdatedAt: row.updatedat,
      DeletedBy: row.deletedby,
      DeletedAt: row.deletedat,
    };
  }

  // Get all customers
  static async findAll() {
    const query = 'SELECT * FROM CustomerMaster WHERE DeletedAt IS NULL;';
    try {
      const result = await pool.query(query);
      return result.rows.map(row => this.formatRow(row));
    } catch (error) {
      throw error;
    }
  }

  // Get customer by ID
  static async findById(id) {
    const query = 'SELECT * FROM CustomerMaster WHERE CustomerID = $1 AND DeletedAt IS NULL;';
    try {
      const result = await pool.query(query, [id]);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update customer
  static async update(id, data) {
    const { UpdatedBy, UpdatedAt, ...updateData } = data;
    
    // Convert empty strings to null for optional fields, preserve booleans, convert numeric types
    const processedData = {};
    for (const key in updateData) {
      const value = updateData[key];
      // For boolean fields, preserve the boolean value
      if (key === 'IsActive' || key === 'MarketingConsent') {
        processedData[key] = value !== undefined && value !== '' ? value : (key === 'IsActive' ? true : false);
      } else if (key === 'LoyalityPoints') {
        // Convert to numeric type
        processedData[key] = value === '' || value === null ? null : parseFloat(value);
      } else if (key === 'ExtraInt1' || key === 'CreatedBy' || key === 'UpdatedBy' || key === 'DeletedBy' || key === 'BranchID') {
        // Convert to integer type
        processedData[key] = value === '' || value === null ? null : parseInt(value);
      } else {
        // For other fields, convert empty strings to null
        processedData[key] = value === '' ? null : value;
      }
    }
    
    const fields = Object.keys(processedData)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = [...Object.values(processedData), UpdatedBy || 1, UpdatedAt || new Date().toISOString().split('T')[0], id];

    const query = `
      UPDATE CustomerMaster 
      SET ${fields}, UpdatedBy = $${Object.keys(processedData).length + 1}, UpdatedAt = $${Object.keys(processedData).length + 2}
      WHERE CustomerID = $${Object.keys(processedData).length + 3} AND DeletedAt IS NULL
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, values);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Soft delete customer
  static async delete(id, DeletedBy, DeletedAt) {
    const query = `
      UPDATE CustomerMaster 
      SET DeletedBy = $1, DeletedAt = $2
      WHERE CustomerID = $3
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [DeletedBy, DeletedAt, id]);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Get customers by BranchID
  static async findByBranchId(branchId) {
    const query = 'SELECT * FROM CustomerMaster WHERE BranchID = $1 AND DeletedAt IS NULL;';
    try {
      const result = await pool.query(query, [branchId]);
      return result.rows.map(row => this.formatRow(row));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CustomerMaster;
