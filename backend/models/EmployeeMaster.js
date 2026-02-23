const pool = require('../config/db');

class EmployeeMaster {
  // Get all employees
  static async getAll() {
    const sql = `SELECT EmployeeID, FirstName, LastName FROM EmployeeMaster ORDER BY FirstName`;
    const { rows } = await pool.query(sql);
    return rows;
  }

  // Search employees by name (for staff fields)
  static async searchByName(query) {
    const sql = `SELECT EmployeeID, FirstName, LastName FROM EmployeeMaster WHERE FirstName ILIKE $1 OR LastName ILIKE $1 ORDER BY FirstName LIMIT 10`;
    const values = [`%${query}%`];
    const { rows } = await pool.query(sql, values);
    return rows;
  }
}

module.exports = EmployeeMaster;
