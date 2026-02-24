// ============================================
// TEMPLATE: How to Update Models
// ============================================
// Add this method to: CustomerMaster, VehicleDetails, ItemMaster models

// Add this method to your existing model class:

static async getAllByBranch(branchId) {
  const result = await pool.query(
    `SELECT * FROM customername WHERE branchid = $1 AND deletedat IS NULL ORDER BY id DESC`,
    [branchId]
  );
  return result.rows;
}

// Replace "customername" and "id" with actual table and primary key columns
// Examples:

// For CustomerMaster:
static async getAllByBranch(branchId) {
  const result = await pool.query(
    `SELECT * FROM CustomerMaster WHERE BranchId = $1 AND DeletedAt IS NULL ORDER BY CustomerId DESC`,
    [branchId]
  );
  return result.rows;
}

// For VehicleDetails:
static async getAllByBranch(branchId) {
  const result = await pool.query(
    `SELECT * FROM vehicledetail WHERE branchid = $1 AND deletedat IS NULL ORDER BY vehicledetailid DESC`,
    [branchId]
  );
  return result.rows;
}

// For ItemMaster:
static async getAllByBranch(branchId) {
  const result = await pool.query(
    `SELECT * FROM itemmaster WHERE branchid = $1 AND deletedat IS NULL ORDER BY itemid DESC`,
    [branchId]
  );
  return result.rows;
}
