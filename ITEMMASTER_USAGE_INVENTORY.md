# ItemMaster Usage Inventory - Complete Codebase Scan

**Date**: March 14, 2026  
**Scope**: Backend (Node.js) + Frontend (React)  
**Status**: Comprehensive mapping of all ItemMaster table usage

---

## Executive Summary

ItemMaster is a **SHARED MASTER** table (available to all branches, no branch isolation) that defines all products/items in the system. It's referenced throughout:
- **13+ API endpoints**
- **7 backend model/controller files**
- **6 frontend components**
- **3 supporting route files**
- **2+ migration files**
- **Validation/points/serial number tracking systems**

---

## 1. DATABASE SCHEMA & MIGRATIONS

### Core Table: `itemmaster`
**Key Columns**: `itemid` (PK), `partnumber`, `itemname`, `uom`, `mrp`, `duplicateserialnumber`, `points`

| File | Type | Purpose |
|------|------|---------|
| [backend/migrations/add-serial-number-fields.js](backend/migrations/add-serial-number-fields.js) | Migration | Adds `duplicateserialnumber` BOOLEAN and `points` INTEGER columns to itemmaster |
| [backend/migrations/create-serial-number-table.js](backend/migrations/create-serial-number-table.js) | Migration | Creates serialnumber table with FK to itemmaster(itemid) |
| [backend/migrations/create-points-transaction-table.js](backend/migrations/create-points-transaction-table.js) | Migration | Creates pointstransaction table with FK to itemmaster(itemid) |

---

## 2. API ENDPOINTS USING ItemMaster

### GET Endpoints (Read)

#### [backend/routes/itemRoutes.js](backend/routes/itemRoutes.js#L1)
- **`GET /api/items`** - Get all items from itemmaster (no branch filter)
  - Model: `ItemMaster.getAll()`
  - Returns: itemid, partnumber, itemname, uom, mrp
  - Filter: excludes deleted items (deletedat IS NULL)

- **`GET /api/items/:id`** - Get single item by ID
  - Model: `ItemMaster.getById()`
  - Returns: complete item record

- **`GET /api/items/search?q=<query>`** - Search items by partnumber or itemname
  - Model: `ItemMaster.searchByPartNumber()`
  - Case-insensitive search (ILIKE), returns up to 20 results
  - Used by: Search dropdowns, autocomplete fields

- **`GET /api/items/tax/first-taxid`** - Get first tax record
  - Related to items but queries TaxMaster, not itemmaster directly

#### [backend/routes/serviceRoutes.js](backend/routes/serviceRoutes.js#L49)
- **`GET /api/items-services/all`** - Get ALL items + services combined
  - Fetches from: `itemmaster` (items) + `servicemaster` (services)
  - No qty validation, returns all available items without filter
  - Used by: InvoiceForm initial dropdown load

- **`GET /api/items-services/search?q=<query>`** - Search items + services hybrid
  - **Items source**: `itemdetail` JOIN `itemmaster` (with qty info)
  - **Services source**: `servicemaster`
  - Returns: `partnumber`, `itemname`, `itemdescription`, `uom`, `mrp`, `availableqty`
  - Used by: Dropdown search in invoice creation (Invoice+ mode)
  - Branch-specific: Items filtered by user's branch

### POST Endpoints (Create/Update)

#### [backend/routes/itemRoutes.js](backend/routes/itemRoutes.js#L75)
- **`POST /api/items/detail/update-quantity`** - Update/create ItemDetail record
  - Updates quantity in `itemdetail` table (branch-specific)
  - Input: `itemId`, `branchId`, `qtyToAdd`
  - Linked to ItemMaster via itemid FK

#### [backend/routes/itemmaster-config.js](backend/routes/itemmaster-config.js)
- **`PUT /api/itemmaster/:itemid/serialconfig`** - Update serial number configuration
  - Model: `ItemMaster.updateSerialNumberConfig()`
  - Updates `duplicateserialnumber` field in itemmaster
  - Body: `{ duplicateserialnumber: boolean }`

- **`PUT /api/itemmaster/:itemid/points`** - Update item points value
  - Direct SQL: `UPDATE itemmaster SET points = $1`
  - Body: `{ points: integer }`

- **`GET /api/itemmaster/serialconfig/required`** - Get items requiring serial tracking
  - Model: `ItemMaster.getSerialNumberRequiredItems()`
  - Returns: All items with `duplicateserialnumber = true`

- **`GET /api/itemmaster/:itemid/hasserial`** - Check if item needs serial tracking
  - Model: `ItemMaster.hasSerialNumberTracking(itemId)`
  - Model: `ItemMaster.allowsDuplicateSerialNumbers(itemId)`
  - Model: `ItemMaster.getPoints(itemId)`

---

## 3. BACKEND MODELS & QUERIES

### [backend/models/ItemMaster.js](backend/models/ItemMaster.js)
**Purpose**: Data access layer for itemmaster table

| Method | Query Type | Purpose |
|--------|-----------|---------|
| `getAll()` | SELECT | Fetch all active items (no deletedat) |
| `getById(itemId)` | SELECT | Fetch single item by ID |
| `getByPartNumber(partnumber)` | SELECT | Fetch item by part number |
| `searchByPartNumber(query)` | SELECT | ILIKE search on partnumber/itemname |
| `updateSerialNumberConfig(itemId, data)` | UPDATE | Set `duplicateserialnumber` flag |
| `getSerialNumberRequiredItems()` | SELECT | Find items with serial tracking enabled |
| `hasSerialNumberTracking(itemId)` | SELECT | Check if item requires serial numbers |
| `allowsDuplicateSerialNumbers(itemId)` | SELECT | Check if duplicates allowed |
| `getPoints(itemId)` | SELECT | Get points value for item |

### [backend/models/InvoiceDetail.js](backend/models/InvoiceDetail.js)
**Purpose**: Line items in invoices (references itemmaster)

| Method | Query | Relationship |
|--------|-------|--------------|
| `create()` | INSERT into invoicedetail | Receives `ItemID` parameter |
| `getByInvoiceId()` | SELECT + LEFT JOIN itemmaster | Joins on itemid to get partnumber, itemname |
| | SELECT + LEFT JOIN servicemaster | Also joins servicemaster for item descriptions |

**Key logic**: When fetching invoice line items, queries both itemmaster (for items) and servicemaster (for services) to get descriptions.

### [backend/models/SerialNumber.js](backend/models/SerialNumber.js)
**Purpose**: Track serial numbers for items requiring serial tracking

All queries JOIN itemmaster to fetch:
- Item name, part number
- Used in GET endpoints for serial number lookup

| Query | Purpose |
|-------|---------|
| `JOIN itemmaster ON sn.itemid = im.itemid` (Multiple) | Link serial numbers to actual item data |
| `getByInvoiceDetail(invoiceDetailId)` | Get serials for a specific purchase |

### [backend/models/PointsTransaction.js](backend/models/PointsTransaction.js)
**Purpose**: Track reward points earned per item purchase

| Query | Purpose |
|-------|---------|
| `SELECT points FROM itemmaster WHERE itemid = $1` | Get points value at transaction time |
| `JOIN itemmaster` (6+ times) | Link points transactions to item details |

---

## 4. INVOICE MANAGEMENT

### [backend/controllers/invoiceController.js](backend/controllers/invoiceController.js#L1)
**Function**: `saveInvoice()` - Create invoice with line items

**ItemMaster Usage**:
1. Accepts array of line items in request body
2. Creates InvoiceDetail records (which reference itemid)
3. Validates item existence (not explicitly shown in snippet, but implied)
4. Stores: itemid, qty, unitprice, linetotal per item

### [backend/routes/invoiceRoutes.js](backend/routes/invoiceRoutes.js)
**Integration points**:
- Passes item data through invoice creation workflow
- InvoiceDetail.create() receives ItemID

---

## 5. FRONTEND COMPONENTS

### [frontend/src/api.js](frontend/src/api.js) - API Client Layer

**Item-related functions**:

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `getAllItems()` | GET /api/items | Fetch all items for dropdown |
| `searchItems(query)` | GET /api/items/search?q= | Search items by part number/name |
| `searchItemsAndServices(query)` | GET /api/items-services/search?q= | Hybrid search items+services |
| `searchItemsInvoiceMode(query)` | GET /api/items-services/search?q= | Invoice mode search (filters client-side) |
| `getAllItemsAndServices()` | GET /api/items-services/all | Get all items+services unfiltered |
| `getAllItemsAndServicesInvoicePlus()` | GET /api/items-services/search?q= + /services | Invoice+ mode: items with qty + services |
| `updateItemDetailQuantity(itemId, branchId, qtyToAdd)` | POST /api/items/detail/update-quantity | Update inventory quantity |
| `getAllServices()` | GET /api/services | Get services (not ItemMaster, but related) |

### [frontend/src/components/InvoiceForm.js](frontend/src/components/InvoiceForm.js)
**Purpose**: Standard invoice creation form (no qty constraints)

**ItemMaster Integration**:
1. **Item Dropdown/Search**:
   - State: `itemInput`, `itemResults`, `showItemPopup`
   - Calls: `searchItemsInvoiceMode()` or `searchItemsAndServices()`
   - On mode='invoice': uses `searchItemsInvoiceMode()`
   - On mode='invoice-plus': uses `searchItemsAndServices()`

2. **Grid Row Management**:
   - State: `gridRows` - Array of line items
   - Each row stores: itemid, itemname, qty, unitprice, linetotal, etc.
   - User can add/remove rows, select items from dropdown

3. **Item Selection Handler**:
   - Triggered when user clicks an item in dropdown
   - Populates selected item data into current row
   - Updates item-related fields (partnumber, description, price)

4. **Quantity Validation** (mode-dependent):
   - Standard invoice: NO qty validation
   - Invoice+ mode: Checks `availableqty` (from itemdetail)
   - Only allows if qty on hand > 0

5. **Update Items Feature**:
   - State: `updateItemsDropdownOpen`, `updateItemsDropdownResults`, `updateItemsDropdownIndex`
   - Allows modifying item quantities in existing invoice
   - Calls: `updateItemDetailQuantity()` API

6. **Submission**:
   - Calls: `saveInvoice()` or `updateInvoice()`
   - Passes gridRows (array of items) to backend
   - Backend creates InvoiceDetail records per item

### [frontend/src/components/InvoiceMaster.js](frontend/src/components/InvoiceMaster.js)
**Purpose**: Invoice list and management screen

**ItemMaster Usage**:
- Displays invoices with item counts
- May show item details in expanded view
- Uses InvoiceForm for creation/editing

### [frontend/src/components/InvoicePlus.js](frontend/src/components/InvoicePlus.js)
**Purpose**: Advanced invoice mode (Ashok-only, with qty validation)

**ItemMaster Usage**:
- Wrapper around InvoiceForm with `mode='invoice-plus'`
- Enforces inventory constraints
- Requires `availableqty > 0` for each item selected
- Uses itemdetail JOIN itemmaster for qty validation

### [frontend/src/components/Payment.js](frontend/src/components/Payment.js)
**Purpose**: Payment recording screen

**ItemMaster Usage** (Indirect):
- Displays invoices with line item summaries
- Item details shown in invoice detail view
- Uses invoice data (which includes items from itemmaster)

### [frontend/src/components/PaymentModal.js](frontend/src/components/PaymentModal.js)
**Purpose**: Payment detail modal

**ItemMaster Usage** (Indirect):
- Shows invoice items being paid
- References itemmaster data through invoicedetail

---

## 6. VALIDATION & CALCULATION LOGIC

### ItemMaster-tied Validation

#### Serial Number Requirements
- Check: `ItemMaster.hasSerialNumberTracking(itemId)`
- Table: `itemmaster.duplicateserialnumber` column
- Used by: Serial number routes to enforce serial entry

#### Points Calculation
- Query: `SELECT points FROM itemmaster WHERE itemid = $1`
- Used by: PointsTransaction.recordPoints()
- Logic: Multiplies `item.points * quantity` to get reward points earned

#### Quantity Validation (Invoice+)
- Frontend: Filters items to `availableqty > 0`
- Source: `itemdetail JOIN itemmaster`
- Prevents selling more than available stock

---

## 7. ITEM SEARCH & FILTERING

### Search Patterns

#### Simple Search (Frontend)
- **Scope**: Searches itemmaster only
- **Fields**: partnumber, itemname
- **Query**: `ILIKE` (case-insensitive)
- **Used by**: General item dropdown

#### Hybrid Search (Invoice)
- **Scope**: itemdetail (items with qty) + servicemaster (services)
- **Query**: Filters by partnumber/itemname/description
- **Condition**: Branch-specific for items, global for services
- **Returns**: JSON with `source: 'item' | 'service'`

#### Invoice+ Search (Advanced)
- **Scope**: itemdetail JOIN itemmaster + servicemaster
- **Query**: Same as hybrid search but client filters further
- **Additional**: Includes `availableqty` field for qty validation

---

## 8. SUPPORTING DATA STRUCTURES

### Related Tables

| Table | FK to ItemMaster | Purpose |
|-------|------------------|---------|
| `itemdetail` | itemid | Branch-specific inventory levels per item |
| `invoicedetail` | itemid | Line item details in invoices |
| `serialnumber` | itemid | Serial number tracking for tracked items |
| `pointstransaction` | itemid | Reward points earned per item purchase |

### Joins Used

```sql
-- Standard item with inventory
SELECT * FROM itemdetail id
JOIN itemmaster im ON id.itemid = im.itemid
WHERE id.branchid = $userBranchId

-- Invoice line items with descriptions
SELECT * FROM invoicedetail id
LEFT JOIN itemmaster im ON id.itemid = im.itemid
LEFT JOIN servicemaster sm ON id.itemid = sm.serviceid -- also services

-- Serial numbers with item info
SELECT * FROM serialnumber sn
JOIN itemmaster im ON sn.itemid = im.itemid

-- Points transactions with item data
SELECT * FROM pointstransaction pt
JOIN itemmaster im ON pt.itemid = im.itemid
```

---

## 9. SPECIFIC FILES & LINE REFERENCES

### Backend API Changes Required Points
- [backend/routes/itemRoutes.js](backend/routes/itemRoutes.js) - Line 23-76: All item GET/POST endpoints
- [backend/routes/serviceRoutes.js](backend/routes/serviceRoutes.js) - Line 49-140: Combined items-services search
- [backend/routes/itemmaster-config.js](backend/routes/itemmaster-config.js) - Line 3-130: Serial/points config endpoints
- [backend/models/ItemMaster.js](backend/models/ItemMaster.js) - All methods test itemmaster queries
- [backend/models/InvoiceDetail.js](backend/models/InvoiceDetail.js) - Line 65-80: JOIN with itemmaster

### Frontend Changes Required Points
- [frontend/src/api.js](frontend/src/api.js) - Line 444-530: All item API calls
- [frontend/src/components/InvoiceForm.js](frontend/src/components/InvoiceForm.js) - Line 5-1200+: Item dropdown, grid, search
- [frontend/src/components/InvoicePlus.js](frontend/src/components/InvoicePlus.js) - Line 1-15: Qty validation wrapper

---

## 10. DISPLAY PATTERNS

### Where Item Data is Shown

| Screen | Component | Item Fields | Data Source |
|--------|-----------|-------------|-------------|
| Invoice Creation | InvoiceForm dropdown | partnumber, itemname, mrp | itemmaster |
| Invoice Creation | Line item grid | partnumber, qty, unitprice, linetotal | itemmaster + user input |
| Invoice List | InvoiceList | Item count per invoice | invoicedetail |
| Invoice Details | InvoiceForm | Full line items | invoicedetail JOIN itemmaster |
| Payment | Payment component | Items in invoice being paid | invoicedetail |
| Serial Numbers | SerialNumber routes | Item details with serials | serialnumber JOIN itemmaster |
| Reports | Not yet implemented | Would join invoicedetail + itemmaster | N/A |

---

## 11. SEARCH & FILTER FUNCTIONALITY

### Item Dropdown Filters

**On InvoiceForm line item selection**:
1. User types in item field
2. Autocomplete calls API with partial query
3. Results filtered by:
   - partnumber (ILIKE match)
   - itemname (ILIKE match)
   - description (ILIKE match)
4. Returns up to 20 itemmaster records

**On Invoice+ mode**:
1. Same search as above
2. Additionally filters by `availableqty > 0`
3. Prevents selection of out-of-stock items

### Item List Display
- General list shows all itemmaster records
- No pagination implemented (could be issue with 11,426+ items)
- Sorted by partnumber

---

## 12. MIGRATIONS & DATA MODIFICATIONS

### Item Data Processing Files

| File | Purpose | ItemMaster Impact |
|------|---------|-------------------|
| [backend/migrations/add-serial-number-fields.js](backend/migrations/add-serial-number-fields.js) | Add serial/points columns | ALTER TABLE itemmaster ADD COLUMN |
| Database scripts | Historical imports | Migrated 605 of 11,426 itemmaster records |

### Known Issues
- itemmaster migration incomplete: 605/11,426 rows (5%)
- 10,821 itemmaster rows missing from database
- Affects: Item availability in dropdowns, invoice line items

---

## 13. SUMMARY TABLE

| Category | Count | Files |
|----------|-------|-------|
| **API Endpoints** | 13+ | itemRoutes, serviceRoutes, itemmaster-config |
| **Backend Models** | 3+ | ItemMaster, InvoiceDetail, SerialNumber, PointsTransaction |
| **Frontend Components** | 6 | InvoiceForm, InvoicePlus, InvoiceMaster, Payment, PaymentModal |
| **Route Files** | 3 | itemRoutes, serviceRoutes, itemmaster-config |
| **Supporting Tables** | 4 | itemdetail, invoicedetail, serialnumber, pointstransaction |
| **Migrations** | 2+ | add-serial-number-fields, create-serial-number-table |

---

## 14. RECOMMENDATIONS FOR ITEMMASTER CHANGES

If modifying ItemMaster table structure:

1. **Add columns**: 
   - Update [backend/models/ItemMaster.js](backend/models/ItemMaster.js) SELECT statements
   - Update all API responses that include new fields
   - Test item search with new fields

2. **Modify business logic**:
   - Serial number tracking: Update [backend/routes/itemmaster-config.js](backend/routes/itemmaster-config.js)
   - Points calculation: Update [backend/models/PointsTransaction.js](backend/models/PointsTransaction.js)
   - Qty validation: Update [frontend/src/components/InvoiceForm.js](frontend/src/components/InvoiceForm.js)

3. **Database queries**:
   - All itemmaster JOINs in invoicedetail, serialnumber, pointstransaction routes
   - Check [backend/migrations/](backend/migrations/) for any hardcoded itemmaster references

4. **Frontend displays**:
   - Item dropdown formatting in InvoiceForm
   - Item list pagination (currently all items returned)
   - Search result display formatting

---

## 15. AUDIT TRAIL

**Places that CREATE/UPDATE itemmaster**:
1. Direct inserts: Import scripts (not yet found in current code)
2. Column updates: Serial config endpoint - [backend/routes/itemmaster-config.js](backend/routes/itemmaster-config.js#L72)
3. Column updates: Points endpoint - [backend/routes/itemmaster-config.js](backend/routes/itemmaster-config.js#L72)
4. Soft deletes: InvoiceDetail.create() does NOT delete items, only marks invoicedetail as deleted

**Read-only itemmaster access** (majority):
- All item search
- All item display
- All quantity references
- All serial tracking checks

---

**Document Complete**. All ItemMaster usages mapped from source code analysis.
