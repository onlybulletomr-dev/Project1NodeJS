# Data Architecture: Shared Masters vs Branch-Specific Data

## Overview

Your ERP system uses a **hybrid data model**:
- **Shared Masters**: Available to all branches (VehicleMaster, VehicleDetails, ItemMaster, ItemCategoryMaster)
- **Branch-Specific Data**: Each branch has their own operational records (InvoiceMaster, CustomerMaster, ItemDetail)

This enables:
✅ All branches use same vehicle/item catalog
✅ All branches can reference same vehicle instances
✅ Each branch manages their own customer relationships
✅ Each branch manages their own inventory levels (ItemDetail per branch)
✅ Each branch tracks their own invoices and transactions
✅ Complete audit trail (who created/modified what)

---

## Detailed Breakdown

### 📦 SHARED MASTERS (No BranchId)

These tables are available to ALL branches. No branch isolation.

#### **VehicleMaster**
```
Purpose: Global vehicle catalog (make, model, year, etc.)
BranchId: ❌ NOT added (shared across all branches)
Access: All branches can VIEW and USE
Example:
  - Maruti Swift (exists once, used by all branches)
  - Honda City (exists once, used by all branches)
  - Toyota Innova (exists once, used by all branches)

Columns:
  - VehicleId (PK)
  - Make, Model, Year, Engine Type
  - CreatedBy (tracks who created master - ✅ ADDED)
  - UpdatedBy (tracks who updated master - ✅ ADDED)
  
Queries:
  - GET /api/vehicles → ALL vehicles (no branch filter)
  - SELECT * FROM VehicleMaster WHERE DeletedAt IS NULL
```

### 📦 SHARED MASTERS (No BranchId)

These tables are available to ALL branches. No branch isolation.

#### **VehicleMaster**
```
Purpose: Global vehicle catalog (make, model, year, etc.)
BranchId: ❌ NOT added (shared across all branches)
Access: All branches can VIEW and USE
Example:
  - Maruti Swift (exists once, used by all branches)
  - Honda City (exists once, used by all branches)
  - Toyota Innova (exists once, used by all branches)

Columns:
  - VehicleId (PK)
  - Make, Model, Year, Engine Type
  - CreatedBy (tracks who created master - ✅ ADDED)
  - UpdatedBy (tracks who updated master - ✅ ADDED)
  
Queries:
  - GET /api/vehicles → ALL vehicles (no branch filter)
  - SELECT * FROM VehicleMaster WHERE DeletedAt IS NULL
```
```
Purpose: Global item/part catalog (part numbers, names, categories)
BranchId: ❌ NOT added (shared across all branches)
Access: All branches can VIEW and USE
Example:
  - Engine Oil (exists once, used by all branches)
  - Air Filter (exists once, used by all branches)
  - Brake Pads (exists once, used by all branches)

Columns:
  - ItemId (PK)
  - PartNumber, ItemName, Category
  - CreatedBy (tracks who created master - ✅ ADDED)
  - UpdatedBy (tracks who updated master - ✅ ADDED)

Queries:
  - GET /api/items → ALL items (no branch filter)
  - SELECT * FROM ItemMaster WHERE DeletedAt IS NULL
```

#### **ItemCategoryMaster**
```
Purpose: Item category definitions (parts, labor, etc.)
BranchId: ❌ NOT added (shared)
Access: All branches VIEW
Columns:
  - CategoryId (PK)
  - CategoryName
  - CreatedBy (✅ ADDED)
  - UpdatedBy (✅ ADDED)
```

---

### 🏢 BRANCH-SPECIFIC DATA (With BranchId)

Each branch manages their own operational records.

#### **CustomerMaster** (BRANCH-SPECIFIC)
```
Purpose: Customer records maintained per branch
BranchId: ✅ YES - Each branch manages their own customers
Access: User sees ONLY their branch's customers
Example:
  Branch 2 (PBM):
    - Vikram Singh (BranchId=2)
    - Rahul Sharma (BranchId=2)
  
  Branch 3 (OMR):
    - Priya Nair (BranchId=3)
    - Amit Verma (BranchId=3)

Columns:
  - CustomerId (PK)
  - FirstName, LastName, Phone, Email
  - BranchId (FK) ✅ ADDED (branch isolation)
  - CreatedBy (FK) ✅ ADDED (audit trail)
  - UpdatedBy (FK) ✅ ADDED (audit trail)

Queries:
  - GET /api/customers (for user in Branch 2)
  - SELECT * FROM CustomerMaster 
    WHERE BranchId = 2 AND DeletedAt IS NULL
```

#### **VehicleDetails**
```
Purpose: Vehicle instances/assignments (shared catalog of all vehicles)
BranchId: ❌ NOT added (shared across all branches)
Access: All branches can VIEW and USE
Relationship: VehicleDetails.VehicleId → VehicleMaster.VehicleId (one-to-many)

Example:
  - DL01AB1234 (Maruti Swift) - Available to all branches
  - MH02CD5678 (Honda City) - Available to all branches
  - KA03EF9012 (Hyundai i20) - Available to all branches
  - TN04GH3456 (Tata Nexon) - Available to all branches

Columns:
  - VehicleDetailId (PK)
  - RegistrationNumber (UNIQUE)
  - VehicleId (FK) → VehicleMaster
  - Color, Year, EngineNumber, ChassisNumber
  - CreatedBy (tracks who created vehicle detail - ✅ ADDED)
  - UpdatedBy (tracks who updated vehicle detail - ✅ ADDED)

Queries:
  - GET /api/vehicle-details → ALL vehicle details (no branch filter)
  - SELECT * FROM VehicleDetails WHERE DeletedAt IS NULL
```

#### **ItemDetail** (BRANCH-SPECIFIC)
```
Purpose: Item stock/assignments maintained per branch
BranchId: ✅ YES - Each branch manages their own inventory
Access: User sees ONLY their branch's item inventory
Relationship: ItemDetail.ItemId → ItemMaster.ItemId

Example:
  Branch 2 (PBM):
    - Engine Oil (SKU: EO001) - Qty: 50 - BranchId=2
    - Air Filter (SKU: AF001) - Qty: 30 - BranchId=2
  
  Branch 3 (OMR):
    - Engine Oil (SKU: EO001) - Qty: 25 - BranchId=3
    - Air Filter (SKU: AF001) - Qty: 15 - BranchId=3

Columns:
  - ItemDetailId (PK)
  - ItemId (FK) → ItemMaster (SHARED)
  - Quantity, Price
  - BranchId (FK) ✅ ADDED (branch isolation)
  - CreatedBy (FK) ✅ ADDED (audit trail)
  - UpdatedBy (FK) ✅ ADDED (audit trail)

Queries:
  - GET /api/item-inventory (for user in Branch 2)
  - SELECT * FROM ItemDetail 
    WHERE BranchId = 2 AND DeletedAt IS NULL
```

#### **InvoiceMaster** (BRANCH-SPECIFIC)
```
Purpose: Sales invoices maintained per branch
BranchId: ✅ YES - Each branch manages their own invoices
Access: User sees ONLY their branch's invoices

Columns:
  - InvoiceId (PK)
  - InvoiceNumber, InvoiceDate
  - CustomerId (FK) → CustomerMaster (customer selected from branch's customers)
  - VehicleId (FK) → VehicleDetails (vehicle selected from branch's vehicles)
  - BranchId (FK) ✅ ADDED (forced from user's branch)
  - CreatedBy (FK) ✅ ADDED (tracks who created)
  - UpdatedBy (FK) ✅ ADDED (tracks who updated)

Queries:
  - GET /api/invoices (for user in Branch 2)
  - SELECT * FROM InvoiceMaster 
    WHERE BranchId = 2 AND DeletedAt IS NULL
```

---

## Controller Implementation Patterns

### Pattern A: SHARED MASTER (VehicleMaster, ItemMaster)

```javascript
// Vehicle Controller - SHARED MASTER (no branch filter)
exports.getVehicles = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // ❌ NO branch filter - return ALL vehicles
    const vehicles = await VehicleMaster.getAll();
    
    res.status(200).json({
      success: true,
      message: 'All vehicles retrieved (shared master)',
      data: vehicles,
      audit: `Retrieved by: ${userId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new vehicle master (global)
exports.createVehicle = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { make, model, year, engineType } = req.body;
    
    // NO BranchId field - this is a global master
    const vehicleData = {
      make,
      model,
      year,
      engineType,
      CreatedBy: userId  // Only tracks WHO created it
    };
    
    const vehicle = await VehicleMaster.create(vehicleData);
    
    res.status(201).json({
      success: true,
      message: 'Vehicle master created (available to all branches)',
      data: vehicle,
      createdBy: userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Pattern B: SHARED DETAIL (VehicleDetails)

```javascript
// Vehicle Details Controller - SHARED DETAILS (no branch isolation)
exports.getVehicleDetails = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // ❌ NO branch filter - return ALL vehicle details
    const vehicles = await VehicleDetails.getAll();
    
    res.status(200).json({
      success: true,
      message: 'All vehicle details retrieved (shared across all branches)',
      data: vehicles,
      audit: `Retrieved by: ${userId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create vehicle detail (global)
exports.createVehicleDetail = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { vehicleId, registrationNumber, color, engineNumber } = req.body;
    
    // NO BranchId field - this is a shared detail
    const vehicleDetailData = {
      vehicleId,          // Reference to VehicleMaster (shared)
      registrationNumber, // Global registration number (UNIQUE)
      color,
      engineNumber,
      CreatedBy: userId   // Only tracks WHO created it
    };
    
    const vehicleDetail = await VehicleDetails.create(vehicleDetailData);
    
    res.status(201).json({
      success: true,
      message: 'Vehicle detail created (available to all branches)',
      data: vehicleDetail,
      createdBy: userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Pattern C: BRANCH-SPECIFIC DETAIL (ItemDetail)

```javascript
// Item Detail Controller - BRANCH-SPECIFIC INVENTORY
exports.getItemDetails = async (req, res) => {
  try {
    const userBranchId = req.user?.branchId;
    const userId = req.user?.userId;
    
    // ✅ BRANCH FILTER - return only this branch's item inventory
    const items = await ItemDetail.getAllByBranch(userBranchId);
    
    res.status(200).json({
      success: true,
      message: 'Item inventory for your branch',
      data: items,
      branch: userBranchId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create item detail (assign to branch)
exports.createItemDetail = async (req, res) => {
  try {
    const userBranchId = req.user?.branchId;
    const userId = req.user?.userId;
    const { itemId, quantity, price } = req.body;
    
    // ✅ FORCE user's branch
    const itemDetailData = {
      itemId,             // Reference to ItemMaster (shared)
      quantity,
      price,
      BranchId: userBranchId,  // FORCE from user
      CreatedBy: userId
    };
    
    const itemDetail = await ItemDetail.create(itemDetailData);
    
    res.status(201).json({
      success: true,
      message: 'Item stock created for your branch',
      data: itemDetail,
      branch: userBranchId,
      createdBy: userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## Query Patterns

### Query 1: Get Vehicles (SHARED - no filter)
```sql
-- Returns ALL vehicle masters (shared catalog)
SELECT * FROM VehicleMaster 
WHERE DeletedAt IS NULL;

-- Result: 3 vehicles (Maruti, Honda, Hyundai)
-- Visible to: All branches
```

### Query 2: Get Vehicle Details (SHARED - no filter)
```sql
-- Returns ALL vehicle details (shared across all branches)
SELECT * FROM VehicleDetails 
WHERE DeletedAt IS NULL;

-- Result: 4 vehicles (DL01AB1234, MH02CD5678, KA03EF9012, TN04GH3456)
-- Visible to: All branches
```

### Query 3: Get Item Details (BRANCH-SPECIFIC - with filter)
```sql
-- Returns items for Branch 2 ONLY
SELECT * FROM ItemDetail 
WHERE BranchId = 2 AND DeletedAt IS NULL;

-- Result: 2 items (Engine Oil qty:50, Air Filter qty:30)
-- Visible to: Only Branch 2 users
```

### Query 4: Join Shared Masters + Vehicle Details
```sql
-- Get vehicle details WITH shared master info
SELECT 
  vd.VehicleDetailId,
  vd.RegistrationNumber,
  vm.Make,
  vm.Model,
  vm.Year
FROM VehicleDetails vd
JOIN VehicleMaster vm ON vd.VehicleId = vm.VehicleId
WHERE vd.DeletedAt IS NULL;

-- Result:
-- DL01AB1234 | Maruti | Swift | 2020
-- MH02CD5678 | Honda | City | 2019
-- KA03EF9012 | Hyundai | i20 | 2021
-- TN04GH3456 | Tata | Nexon | 2022
```

---

## API Endpoint Examples

### Shared Masters (No Branch Isolation)

```javascript
GET /api/vehicles
// Returns: All vehicle masters across all branches
// No userId required (public catalog)
// Response: [Maruti Swift, Honda City, Hyundai i20, Tata Nexon]

GET /api/vehicle-details
// Returns: All vehicle details across all branches
// No userId required (shared across all branches)
// Response: [DL01AB1234, MH02CD5678, KA03EF9012, TN04GH3456]

GET /api/items
// Returns: All items across all branches
// No userId required (public catalog)
// Response: [Engine Oil, Air Filter, Brake Pads, ...]

POST /api/vehicles
// Admin only: Create new vehicle (global master)
// Body: { make, model, year }
// BranchId: NOT in request or body

POST /api/vehicle-details
// Admin: Create new vehicle detail (global, accessible to all)
// Body: { vehicleId, registrationNumber, color }
// BranchId: NOT in request or body (shared resource)
```

### Branch-Specific Details (With Branch Isolation)

```javascript
GET /api/item-details?userId=1
// Returns: Item inventory for Branch 2 ONLY
// Requires: userId header (x-user-id: 1)
// Response: [Engine Oil (qty:50), Air Filter (qty:30)] (Branch 2 only)

GET /api/item-details?userId=7
// Returns: Item inventory for Branch 3 ONLY
// Requires: userId header (x-user-id: 7)
// Response: [Engine Oil (qty:25), Air Filter (qty:15)] (Branch 3 only)

POST /api/item-details
// Create item detail for user's branch
// Body: { itemId, quantity, price }
// BranchId: FORCED from user (cannot override)
// Response: Created with BranchId=2 (if user is from Branch 2)
```

---

## Migration Impact Summary

| Table | Type | Change |
|-------|------|--------|
| VehicleMaster | Shared Master | Add CreatedBy, UpdatedBy (NO BranchId) |
| VehicleDetails | Shared Master | Add CreatedBy, UpdatedBy (NO BranchId) |
| ItemMaster | Shared Master | Add CreatedBy, UpdatedBy (NO BranchId) |
| ItemCategoryMaster | Shared Master | Add CreatedBy, UpdatedBy (NO BranchId) |
| ItemDetail | Branch-Specific | Add BranchId ✅, CreatedBy ✅, UpdatedBy ✅ |
| InvoiceMaster | Branch-Specific | Add BranchId ✅, CreatedBy ✅, UpdatedBy ✅ |
| CustomerMaster | Branch-Specific | Add BranchId ✅, CreatedBy ✅, UpdatedBy ✅ |

---

## Testing Scenarios

### Scenario 1: Shared Master Access
```
User: Murali (Branch 2)
Test: GET /api/vehicles

Expected: Returns ALL vehicles (Maruti, Honda, Hyundai, Tata)
✅ Result: Success - masters are shared
```

### Scenario 2: Shared Details Access
```
User: Murali (Branch 2)
Test: GET /api/vehicle-details

Expected: Returns ALL vehicle details (DL01AB1234, MH02CD5678, KA03EF9012, TN04GH3456)
✅ Result: Success - details are shared across all branches

User: Jagatheish (Branch 3)
Test: Same endpoint

Expected: Returns same ALL vehicle details
Status: ✅ Success - sees same vehicles as other branches
```

### Scenario 3: Branch-Specific Item Inventory Isolation
```
User: Murali (Branch 2)
Test: GET /api/item-details

Expected: Returns only Engine Oil (qty:50), Air Filter (qty:30)
Status: ✅ Success - only Branch 2 inventory

User: Jagatheish (Branch 3)
Test: Same endpoint

Expected: Returns only Engine Oil (qty:25), Air Filter (qty:15)
Status: ✅ Success - only Branch 3 inventory
```

### Scenario 4: Item Stock Per Branch (Branch-Specific)
```
User: Murali (Branch 2)
Test: POST /api/item-details { itemId: 1, quantity: 50 }

Expected: Engine Oil stock for Branch 2 = 50
Status: ✅ Success

User: Jagatheish (Branch 3)
Test: Same endpoint with { itemId: 1, quantity: 25 }

Expected: Engine Oil stock for Branch 3 = 25
Status: ✅ Success - separate stock levels per branch
```

---

## Summary

✅ **Shared Masters** (VehicleMaster, VehicleDetails, ItemMaster, ItemCategoryMaster): No BranchId, available to all  
✅ **Branch Details** (ItemDetail, InvoiceMaster, CustomerMaster): BranchId added, isolated per branch  
✅ **Audit Trail**: CreatedBy/UpdatedBy on ALL tables  
✅ **Security**: Middleware enforces branch isolation on branch-specific tables only
