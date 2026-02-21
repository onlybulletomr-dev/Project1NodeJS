const pool = require('../config/db');

class CompanyMaster {
  // Create a new company
  static async create(data) {
    const {
      CompanyName,
      ParentCompanyID,
      LegalStructure,
      RegistrationNumber,
      TaxID,
      AddressLine1,
      AddressLine2,
      City,
      State,
      PostalCode,
      Country,
      ContactPerson,
      EmailAddress,
      PhoneNumber1,
      PhoneNumber2,
      WebsiteUrl,
      LogoImagePath,
      BankName,
      BankAccountNumber,
      BankSwiftCode,
      ExtraVar1,
      ExtraVar2,
      ExtraInt1,
      CreatedBy,
      CreatedAt,
    } = data;

    const query = `
      INSERT INTO CompanyMaster (
        CompanyName, ParentCompanyID, LegalStructure, RegistrationNumber, TaxID,
        AddressLine1, AddressLine2, City, State, PostalCode, Country,
        ContactPerson, EmailAddress, PhoneNumber1, PhoneNumber2, WebsiteUrl, LogoImagePath,
        BankName, BankAccountNumber, BankSwiftCode,
        ExtraVar1, ExtraVar2, ExtraInt1,
        CreatedBy, CreatedAt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *;
    `;

    const values = [
      CompanyName, ParentCompanyID, LegalStructure, RegistrationNumber, TaxID,
      AddressLine1, AddressLine2, City, State, PostalCode, Country,
      ContactPerson, EmailAddress, PhoneNumber1, PhoneNumber2, WebsiteUrl, LogoImagePath,
      BankName, BankAccountNumber, BankSwiftCode,
      ExtraVar1, ExtraVar2, ExtraInt1,
      CreatedBy, CreatedAt,
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all companies
  static async findAll() {
    const query = 'SELECT * FROM CompanyMaster WHERE DeletedAt IS NULL ORDER BY CompanyID DESC;';
    try {
      console.log('Fetching all companies...');
      const result = await pool.query(query);
      console.log('Companies found:', result.rows.length);
      
      // Convert column names to proper casing since PostgreSQL returns lowercase
      const companies = result.rows.map(row => this.formatRow(row));
      
      if (companies.length > 0) {
        console.log('Sample company:', companies[0]);
      }
      return companies;
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  }

  // Helper method to format row with proper casing
  static formatRow(row) {
    return {
      CompanyID: row.companyid,
      CompanyName: row.companyname,
      ParentCompanyID: row.parentcompanyid,
      LegalStructure: row.legalstructure,
      RegistrationNumber: row.registrationnumber,
      TaxID: row.taxid,
      AddressLine1: row.addressline1,
      AddressLine2: row.addressline2,
      City: row.city,
      State: row.state,
      PostalCode: row.postalcode,
      Country: row.country,
      ContactPerson: row.contactperson,
      EmailAddress: row.emailaddress,
      PhoneNumber1: row.phonenumber1,
      PhoneNumber2: row.phonenumber2,
      WebsiteUrl: row.websiteurl,
      LogoImagePath: row.logoimagepath,
      BankName: row.bankname,
      BankAccountNumber: row.bankaccountnumber,
      BankSwiftCode: row.bankswiftcode,
      ExtraVar1: row.extravar1,
      ExtraVar2: row.extravar2,
      ExtraInt1: row.extraint1,
      CreatedBy: row.createdby,
      CreatedAt: row.createdat,
      UpdatedBy: row.updatedby,
      UpdatedAt: row.updatedat,
      DeletedBy: row.deletedby,
      DeletedAt: row.deletedat,
    };
  }

  // Get company by ID
  static async findById(id) {
    const query = 'SELECT * FROM CompanyMaster WHERE CompanyID = $1 AND DeletedAt IS NULL;';
    try {
      const result = await pool.query(query, [id]);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update company
  static async update(id, data) {
    const { UpdatedBy, UpdatedAt, ...updateData } = data;
    const fields = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = [...Object.values(updateData), UpdatedBy, UpdatedAt, id];

    const query = `
      UPDATE CompanyMaster 
      SET ${fields}, UpdatedBy = $${Object.keys(updateData).length + 1}, UpdatedAt = $${Object.keys(updateData).length + 2}
      WHERE CompanyID = $${Object.keys(updateData).length + 3} AND DeletedAt IS NULL
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, values);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Soft delete company
  static async delete(id, DeletedBy, DeletedAt) {
    const query = `
      UPDATE CompanyMaster 
      SET DeletedBy = $1, DeletedAt = $2
      WHERE CompanyID = $3
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [DeletedBy, DeletedAt, id]);
      return this.formatRow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CompanyMaster;
