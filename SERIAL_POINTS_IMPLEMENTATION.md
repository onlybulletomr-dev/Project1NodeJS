# Serial Number & Points System Implementation Guide

**Completed**: March 14, 2026  
**Version**: 1.0

---

## 📋 Overview

This implementation adds two critical features to the ERP system:

1. **Serial Number Tracking**: Configure items to track serial numbers (using existing `serialnumbertracking` field with new `duplicateserialnumber` field)
2. **Points System**: Each item has a fixed points value (vendor-defined) that's awarded on purchase

---

## 🗄️ Database Schema Changes

### 1. ItemMaster Table Updates (Existing Table)

Added two new columns to existing `itemmaster` table:

```sql
ALTER TABLE itemmaster ADD COLUMN duplicateserialnumber BOOLEAN DEFAULT FALSE;
ALTER TABLE itemmaster ADD COLUMN points INTEGER DEFAULT 0;
```

**Columns**:
- `serialnumbertracking` (BOOLEAN, existing field)
  - Indicates if this item requires serial number tracking
  - When TRUE, all purchases should include serial numbers
  
- `duplicateserialnumber` (BOOLEAN, DEFAULT: FALSE) - **NEW**
  - Indicates if the same serial number can be used multiple times for this item
  - When FALSE, enforces unique serial numbers per item per branch
  - When TRUE, allows duplicates (rare, for specialized items)

- `points` (INTEGER, DEFAULT: 0) - **NEW**
  - Points value awarded by vendor for each purchase of this item
  - Multiplied by quantity purchased to get total points for transaction
  - Example: If points=10 and quantity=5, total points awarded = 50

---

### 2. SerialNumber Table (New)

Tracks individual serial numbers for items.

**Table Name**: `serialnumber`

**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| serialnumberid | SERIAL | PRIMARY KEY | Auto-generated unique ID |
| itemid | INTEGER | FK→itemmaster | Item reference |
| invoicedetailid | INTEGER | FK→invoicedetail | Purchase tracking |
| serialnumber | VARCHAR(255) | NOT NULL | Actual serial number string |
| branchid | INTEGER | FK→companymaster | Branch isolation |
| vendorid | INTEGER | FK→companymaster | Vendor/Supplier who provided this item |
| mrp | DECIMAL(10,2) | | Maximum Retail Price at time of entry |
| manufacturingdate | DATE | | Manufacturing/Production date of item |
| status | VARCHAR(50) | DEFAULT: 'SHELF' | Status: SHELF, INVOICED, RETURNED, SCRAPED |
| remarks | VARCHAR(500) | | Optional notes |
| createdby | INTEGER | FK→employeemaster | Audit trail |
| createdat | TIMESTAMP | DEFAULT NOW() | Audit trail |
| updatedby | INTEGER | FK→employeemaster | Audit trail |
| updatedat | TIMESTAMP | | Audit trail |
| deletedat | TIMESTAMP | | Soft delete |

**Status Values**:
- `SHELF`: Item in stock, not yet sold
- `INVOICED`: Item sold and invoiced to customer
- `RETURNED`: Item returned by customer
- `SCRAPED`: Item scrapped/damaged, no longer usable

**Unique Constraint**: `UNIQUE(itemid, serialnumber, branchid)`
- Prevents duplicate serial numbers per item per branch (unless allowduplicateserialnumber=TRUE)

**Indexes**:
- `idx_serialnumber_itemid` - For quick lookups by item
- `idx_serialnumber_invoicedetailid` - For linking to purchases
- `idx_serialnumber_branchid` - For branch filtering
- `idx_serialnumber_serialnumber` - For serial number search
- `idx_serialnumber_vendorid` - For vendor filtering
- `idx_serialnumber_status` - For status-based queries

---

### 3. PointsTransaction Table (New)

Tracks all points earned from vendor purchases.

**Table Name**: `pointstransaction`

**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| pointstransactionid | SERIAL | PRIMARY KEY | Auto-generated unique ID |
| invoiceid | INTEGER | FK→invoicemaster | Purchase reference |
| itemid | INTEGER | FK→itemmaster | Item reference |
| invoicedetailid | INTEGER | FK→invoicedetail | Line item reference |
| branchid | INTEGER | FK→companymaster | Branch isolation |
| quantitypurchased | DECIMAL(10,2) | NOT NULL | Quantity for this purchase |
| pointsperunit | DECIMAL(10,2) | DEFAULT: 1.0 | Points awarded per unit |
| totalpointsawarded | DECIMAL(10,2) | COMPUTED | qty × points_per_unit |
| transactiontype | VARCHAR(50) | DEFAULT: 'PURCHASE' | PURCHASE, REDEMPTION, ADJUSTMENT, etc. |
| remarks | VARCHAR(500) | | Optional notes |
| createdby | INTEGER | FK→employeemaster | Audit trail |
| createdat | TIMESTAMP | DEFAULT NOW() | Audit trail |
| updatedby | INTEGER | FK→employeemaster | Audit trail |
| updatedat | TIMESTAMP | | Audit trail |
| deletedat | TIMESTAMP | | Soft delete |

**Indexes**:
- `idx_pointstx_invoiceid` - For purchase tracking
- `idx_pointstx_itemid` - For item-level reporting
- `idx_pointstx_branchid` - For branch filtering
- `idx_pointstx_createdat` - For date-range queries

---

## 🔧 Migration Scripts

Three migration scripts included in `/backend/migrations/`:

1. **add-serial-number-fields.js**
   - Adds `duplicateserialnumber` and `points` to ItemMaster
   - Checks for existing columns to prevent duplicates
   - Safe to run multiple times

2. **create-serial-number-table.js**
   - Creates SerialNumber table with indexes
   - Sets up foreign keys and unique constraint
   - Creates performance indexes

3. **create-points-transaction-table.js**
   - Creates PointsTransaction table with indexes
   - Sets up foreign keys for audit trail
   - Creates performance indexes

**Run migrations**:
```bash
cd backend
node migrations/add-serial-number-fields.js
node migrations/create-serial-number-table.js
node migrations/create-points-transaction-table.js
```

---

## 📦 New Models

### 1. SerialNumber Model (`backend/models/SerialNumber.js`)

**Key Methods**:

```javascript
// Create
SerialNumber.create({
  itemid, serialnumber, branchid, 
  invoicedetailid, remarks, createdby
})

// Retrieve
SerialNumber.getById(serialNumberId)
SerialNumber.getByItemAndBranch(itemId, branchId)
SerialNumber.getBySerialNumber(serialNumber, branchId)
SerialNumber.getByInvoiceDetail(invoiceDetailId)

// Check existence
SerialNumber.exists(itemId, serialNumber, branchId)

// Update & Delete
SerialNumber.update(serialNumberId, { remarks, updatedby })
SerialNumber.delete(serialNumberId, deletedby)

// Reporting
SerialNumber.getReport(branchId, itemId, dateFrom, dateTo)
```

**Error Handling**:
- Throws error for duplicate serial numbers (if not allowed)
- Validates item configuration before creating
- Soft delete with audit trail

---

### 2. PointsTransaction Model (`backend/models/PointsTransaction.js`)

**Key Methods**:

```javascript
// Create (points automatically taken from item's points field)
PointsTransaction.create({
  invoiceid, itemid, invoicedetailid, branchid,
  quantitypurchased, remarks, createdby
})

// Retrieve
PointsTransaction.getById(transactionId)
PointsTransaction.getByBranch(branchId, limit, offset)
PointsTransaction.getByInvoice(invoiceId)

// Analytics
PointsTransaction.getTotalPointsByItem(itemId, branchId)

// Reports
PointsTransaction.getPurchaseReport(branchId, dateFrom, dateTo)
PointsTransaction.getPointsSummaryReport(branchId)

// Admin
PointsTransaction.delete(transactionId, deletedby)
```

**How Points Are Calculated**:
- Item has a fixed `points` value (e.g., points=10)
- On purchase: `totalPointsAwarded = quantityPurchased × itemPoints`
- Example: If item has points=5 and qty=10 → 50 points awarded

---

### 3. Updated ItemMaster Model (`backend/models/ItemMaster.js`)

**New Methods Added**:

```javascript
// Configuration
ItemMaster.updateSerialNumberConfig(itemId, {
  duplicateserialnumber, updatedby
})

// Queries (using existing serialnumbertracking field)
ItemMaster.getSerialNumberRequiredItems()
ItemMaster.hasSerialNumberTracking(itemId)
ItemMaster.allowsDuplicateSerialNumbers(itemId)
ItemMaster.getPoints(itemId)
```

---

## 🔌 API Endpoints

### Serial Number Endpoints

#### Create Serial Number
```
POST /api/serialnumbers
Body: {
  itemid: integer,
  serialnumber: string,
  branchid: integer,
  invoicedetailid: integer (optional),
  vendorid: integer (optional) - Vendor/Supplier ID,
  mrp: decimal (optional) - Maximum Retail Price,
  manufacturingdate: date (optional) - YYYY-MM-DD format,
  remarks: string (optional)
}
Response: { message: string, data: SerialNumber }
```

#### Get Serial Number
```
GET /api/serialnumbers/:id
Response: SerialNumber object with all fields
```

#### Get Serial Numbers for Item
```
GET /api/serialnumbers/item/:itemid/branch/:branchid
Response: { count: integer, data: SerialNumber[] }
```

#### Search Serial Number
```
GET /api/serialnumbers/search/:serialnumber/branch/:branchid
Response: SerialNumber object
```

#### Serial Number Report (Advanced Filtering)
```
GET /api/serialnumbers/report?branchid=N&itemid=M&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&status=SHELF&vendorid=V
Response: { count: integer, data: ReportRow[] }
Filters available:
- branchid: REQUIRED
- itemid: optional
- dateFrom: optional
- dateTo: optional
- status: optional - SHELF, INVOICED, RETURNED, SCRAPED
- vendorid: optional
```

#### Get Serial Numbers by Status
```
GET /api/serialnumbers/status/:status/branch/:branchid?itemid=M
Response: { count: integer, status: string, data: SerialNumber[] }
Valid statuses: SHELF, INVOICED, RETURNED, SCRAPED
```

#### Get Serial Numbers by Vendor
```
GET /api/serialnumbers/vendor/:vendorid/branch/:branchid?itemid=M
Response: { count: integer, vendorid: integer, data: SerialNumber[] }
```

#### Update Serial Number (Remarks & Status)
```
PUT /api/serialnumbers/:id
Body: {
  remarks: string (optional),
  status: string (optional) - SHELF, INVOICED, RETURNED, SCRAPED
}
Response: { message: string, data: SerialNumber }
```

#### Update Status Only
```
PUT /api/serialnumbers/:id/status
Body: { status: string } - SHELF, INVOICED, RETURNED, SCRAPED
Response: { message: string, data: SerialNumber }
```

#### Delete Serial Number
```
DELETE /api/serialnumbers/:id
Response: { message: string, data: SerialNumber }
```

---

### Points Transaction Endpoints

#### Create Points Transaction (on purchase)
```
POST /api/points/transaction
Body: {
  invoiceid: integer,
  itemid: integer,
  invoicedetailid: integer,
  branchid: integer,
  quantitypurchased: decimal,
  remarks: string (optional)
}
Response: { message: string, data: PointsTransaction }
Note: Points are automatically fetched from item's points field
```

#### Get Transaction
```
GET /api/points/transaction/:id
Response: PointsTransaction object
```

#### Get Branch Transactions
```
GET /api/points/branch/:branchid?limit=100&offset=0
Response: { count: integer, limit: integer, offset: integer, data: PointsTransaction[] }
```

#### Get Invoice Transactions
```
GET /api/points/invoice/:invoiceid
Response: { count: integer, data: PointsTransaction[] }
```

#### Get Item Total Points
```
GET /api/points/item/:itemid/total?branchid=N
Response: { itemid: integer, totalpointsawarded: decimal, transactioncount: integer }
```

#### Purchase Report
```
GET /api/points/report/purchase?branchid=N&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
Response: { count: integer, data: ReportRow[] }
```

#### Points Summary Report
```
GET /api/points/report/summary?branchid=N
Response: { count: integer, data: SummaryRow[] }
```

#### Update Points Per Unit
```
PUT /api/points/item/:itemid/ppunit
Body: { newPointsPerUnit: decimal }
Response: { message: string, data: ItemMaster }
```

#### Delete Transaction
```
DELETE /api/points/transaction/:id
Response: { message: string, data: PointsTransaction }
```

---

### ItemMaster Configuration Endpoints

#### Update Serial Config
```
PUT /api/itemmaster/:itemid/serialconfig
Body: {
  duplicateserialnumber: boolean
}
Response: { message: string, data: ItemMaster }
Note: Uses existing serialnumbertracking field - configure that separately
```

#### Update Item Points
```
PUT /api/itemmaster/:itemid/points
Body: {
  points: integer (non-negative)
}
Response: { message: string, data: ItemMaster }
Note: Points value set by vendor for each unit purchased
```

#### Get Serial-Required Items
```
GET /api/itemmaster/serialconfig/required
Response: { count: integer, data: ItemMaster[] }
```

#### Check Item Configuration
```
GET /api/itemmaster/:itemid/hasserial
Response: {
  itemid: integer,
  partnumber: string,
  itemname: string,
  serialnumbertracking: boolean,
  duplicateserialnumber: boolean,
  points: integer
}
```

---

## 🔄 Integration with Existing System

### When Creating Invoices with Items

1. **Check Item Configuration**:
   ```javascript
   const item = await ItemMaster.getById(itemid);
   if (item.hasserialumber) {
     // Require serial numbers in the invoice
     // Validate serial numbers before saving
   }
   ```

2. **Accept Serial Numbers** (Invoice Detail):
   - Extend invoice line items to accept optional `serialnumbers` array
   - Each element: `{ serialnumber: string, remarks?: string }`

3. **Create Serial Number Records**:
   ```javascript
   for (const sn of serialnumbers) {
     await SerialNumber.create({
       itemid: invoiceDetail.itemid,
       serialnumber: sn.serialnumber,
       branchid: invoice.branchid,
       invoicedetailid: invoiceDetail.invoicedetailid,
       remarks: sn.remarks,
       createdby: user.employeeid
     });
   }
   ```

### When Creating Purchases (Main Vendor - BranchId=1)

1. **Fetch Item Points**:
   ```javascript
   const itemPoints = await ItemMaster.getPoints(itemid);
   // Or from the item object: itemPoints = item.points
   ```

2. **Award Points**:
   ```javascript
   if (invoice.branchid === 1) { // Main vendor
     await PointsTransaction.create({
       invoiceid: invoice.invoiceid,
       itemid: invoiceDetail.itemid,
       invoicedetailid: invoiceDetail.invoicedetailid,
       branchid: invoice.branchid,
       quantitypurchased: invoiceDetail.qty,
       // Points automatically multiplied: qty × item.points
       remarks: `Points for purchase of ${item.itemname}`,
       createdby: user.employeeid
     });
   }
   ```

3. **Points Calculation**:
   - Item points = 5
   - Quantity purchased = 10
   - Total points awarded = 5 × 10 = 50 points

---

## 📊 Reporting Features

### 1. Serial Number Report
**Location**: GET `/api/serialnumbers/report`

**Output Columns**:
- Serial Number ID
- Serial Number Value
- Item (PartNumber, Name)
- Branch
- Date Added
- Created By (Employee Name)
- Remarks

**Use Cases**:
- Track all serial numbers added in a date range
- Find duplicate serial numbers (for items that allow them)
- Generate audit trail for warranty/service claims

---

### 2. Purchase Report (Points)
**Location**: GET `/api/points/report/purchase`

**Output Columns**:
- Transaction ID
- Invoice Number & Date
- Item (PartNumber, Name)
- Quantity Purchased
- Points Per Unit
- Total Points Awarded
- Created By (Employee Name)
- Date Created

**Use Cases**:
- Track total purchases and points awarded
- Identify top-purchased items
- Revenue recognition tied to points

---

### 3. Points Summary Report
**Location**: GET `/api/points/report/summary`

**Output Columns**:
- Item (PartNumber, Name)
- Purchase Count
- Total Quantity Purchased
- Average Points Per Unit
- Total Points Awarded

**Use Cases**:
- Executive summary of top items by points
- Identify popular/fast-moving items
- Planning for future inventory/points allocation

---

## 🚀 Deployment Steps

### 1. Update Backend Code
```bash
cd backend
git pull origin main
npm install  # In case of new dependencies (none in this case)
```

### 2. Run Migrations (IN ORDER)
```bash
# For new installations
node migrations/add-serial-number-fields.js
node migrations/create-serial-number-table.js
node migrations/create-points-transaction-table.js

# For existing tables, add the new columns
node migrations/add-vendor-mrp-status-to-serialnumber.js
```

### 3. Restart Backend
```bash
npm start  # or use your deployment process
```

### 4. Test Endpoints
```bash
# Test create serial with vendor/MRP/manufacturing date
curl -X POST http://localhost:5000/api/serialnumbers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "itemid":115,
    "serialnumber":"SN-001-ABC",
    "branchid":1,
    "vendorid":2,
    "mrp":5000.00,
    "manufacturingdate":"2026-02-15",
    "createdby":1
  }'

# Test status filtering
curl -X GET "http://localhost:5000/api/serialnumbers/status/SHELF/branch/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test vendor filtering
curl -X GET "http://localhost:5000/api/serialnumbers/vendor/2/branch/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test status update
curl -X PUT http://localhost:5000/api/serialnumbers/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status":"INVOICED"}'
```

---

## ✅ Verification Checklist

- [ ] Migrations run successfully without errors
- [ ] New tables exist in database
- [ ] Indexes created (check with `\di` in psql)
- [ ] Routes registered in server.js
- [ ] API endpoints respond with 200 status
- [ ] Authentication middleware present on all endpoints
- [ ] Database connections working
- [ ] Foreign key constraints enforced
- [ ] Soft delete functionality working

---

## 🔒 Security Notes

1. **Authentication**: All endpoints require `authMiddleware`
2. **Authorization**: Consider adding role-based checks for:
   - Points report viewing (admin only?)
   - Serial number deletion
3. **Audit Trail**: All changes logged with `createdby`, `createdat`, `updatedby`, `updatedat`
4. **Data Isolation**: Branch isolation via `branchid` field
5. **Duplicate Prevention**: Unique constraint prevents accidental duplicates

---

## 📅 Future Enhancements

1. **Serial Number Validation**: Add regex patterns for serial number formats per item type
2. **Points Expiry**: Add expiration dates for earned points
3. **Points Redemption**: Track points used for discounts/rewards
4. **Batch Serial Upload**: CSV upload for bulk serial number management
5. **Warranty Integration**: Link serial numbers to warranty tracking
6. **Mobile Barcode Scanning**: QR/barcode scanning for serial numbers
7. **Multi-tier Points**: Different points based on purchase quantity tiers

---

## 📝 Notes

- All new tables follow existing naming conventions (lowercase, English)
- Soft deletes preserve data integrity and audit trail
- Indexes optimized for common query patterns
- Foreign keys ensure referential integrity
- Models follow existing pattern with static async database queries
- Routes follow existing REST convention
- **Points are vendor-provided**: Each item has a fixed points value defined by the vendor
- **Serial Tracking**: Uses existing `serialnumbertracking` field + new `duplicateserialnumber` field
- **Duplicate Serials**: When `duplicateserialnumber=TRUE`, same serial can be used multiple times for that item
- **Serial Status Tracking**: Track item lifecycle - SHELF → INVOICED → RETURNED/SCRAPED
- **Vendor Tracking**: Know which vendor supplied each serialized item
- **Manufacturing Date**: Capture when item was manufactured for warranty/recall purposes
- **MRP Tracking**: Store original Retail Price for each unit received

### Serial Status Transitions

```
SHELF (default)
  ├─→ INVOICED (when sold)
  │     ├─→ RETURNED (if customer returns)
  │     │     └─→ SHELF (if refurbished)
  │     └─→ SCRAPED (if unsaleable)
  │
  └─→ SCRAPED (if damaged in warehouse)
```

---

**End of Implementation Guide**
