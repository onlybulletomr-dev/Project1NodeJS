# Serial Number Update Feature Implementation

## Overview
Added "Update Serial No" button to the Invoice+ screen to enable tracking of serial numbers for items purchased from vendors.

## Features Implemented

### 1. Frontend Components

#### Button Addition (InvoiceForm.js)
- Added "Update Serial No" button next to "Update Items" button in invoice-plus mode
- Blue button (#2196F3) for visual distinction
- Positioned side-by-side with Update Items button (orange #FF9800)

#### SerialNumberUpdatePopup Component (SerialNumberUpdatePopup.js)
A comprehensive modal for managing serial numbers with the following features:

**Item Selector:**
- Dropdown to select which item from the invoice to add serial numbers for
- Shows item name and ordered quantity
- Easy navigation through all invoice items

**Serial Number Data Grid (10 rows):**
- **Serial Number** (Required) - The unique serial identifier
- **Batch** - Batch/Lot number from vendor
- **Manufacturing Date** - Date item was manufactured
- **Expiry Date** - Product shelf-life end date
- **Warranty Expiry** - Warranty coverage end date
- **Condition** - Item condition (New, Refurbished, Used, Damaged)

**Workflow:**
1. User selects an item from dropdown
2. Enters serial numbers in the table (max 10 rows per item)
3. Clicks "Save & Next Item" to save and move to next item
4. Or "Save Serial Numbers" if on last item
5. Displays success/error messages
6. Can navigate back to previous items

### 2. Backend Implementation

#### New API Endpoint

**POST `/api/serialnumbers/bulk-create`**

**Request Body:**
```json
{
  "invoiceid": 123,
  "itemid": 456,
  "invoicedetailid": 789,
  "serialnumbers": [
    {
      "serialnumber": "SN-2026-001",
      "batch": "LOT-2026-001",
      "manufacturingdate": "2026-02-01",
      "expirydate": "2028-02-01",
      "warrexpiry": "2027-02-01",
      "condition": "New"
    }
  ]
}
```

**Response (Success):**
```json
{
  "message": "5 serial number(s) created successfully",
  "created": 5,
  "createdSerials": [
    { "serialnumberid": 1001, "serialnumber": "SN-2026-001" },
    { "serialnumberid": 1002, "serialnumber": "SN-2026-002" }
  ],
  "failed": 0
}
```

**Response (Partial Success):**
```json
{
  "message": "3 serial number(s) created successfully",
  "created": 3,
  "createdSerials": [...],
  "failed": 2,
  "errors": [
    "Row 4: Serial number 'DUP-123' already exists for this item",
    "Row 5: Error message"
  ]
}
```

#### Validation Rules

1. **Item Validation:**
   - Item must exist in itemmaster
   - Item must have `serialnumbertracking = true`

2. **Serial Number Validation:**
   - Serial number is required (cannot be empty)
   - Checks for duplicates if `duplicateserialnumber = false`
   - Returns error if duplicate found

3. **Data Validation:**
   - Dates are optional but must be valid if provided
   - Batch is optional
   - Condition defaults to "New" if not provided

#### Database Impact

**SerialNumber Table Updated With:**
```sql
INSERT INTO serialnumber (
  invoiceid,        -- Links to invoice
  itemid,           -- Links to item
  serialnumber,     -- Unique serial string
  batch,            -- Batch/Lot number
  manufacturingdate,-- Manufacturing date
  expirydate,       -- Product expiry
  warrexpiry,       -- Warranty expiry
  condition,        -- Item condition
  branchid,         -- Branch ownership
  status,           -- Defaults to 'SHELF'
  createdby,        -- User who created
  createdat         -- Creation timestamp
)
```

## User Flow

```
Invoice+ Screen
    ↓
[Items Added to Invoice]
    ↓
User clicks "Update Serial No"
    ↓
SerialNumberUpdatePopup opens
    ↓
Select Item → Enter Serial Numbers (max 10)
    ↓
Click "Save & Next"
    ↓
API: POST /api/serialnumbers/bulk-create
    ↓
Validate Item (exists + serial tracking enabled)
    ↓
For each serial number:
  - Check for duplicates (if not allowed)
  - Insert into database
    ↓
Display results (success/errors)
    ↓
Continue to next item or close popup
```

## Key Features

### 1. Multi-Item Support
- Update serial numbers for multiple items in sequence
- "Save & Next Item" button moves to next item
- Easy navigation between items

### 2. Batch Operations
- Add up to 10 serial numbers at once
- Partial success handling (some rows succeed, others fail)
- Error messages for each failed row

### 3. Data Integrity
- Validates item exists and allows serial tracking
- Prevents duplicate serial numbers (unless configured)
- Tracks who created and when (audit trail)

### 4. Flexibility
- All fields except serial number are optional
- Defaults applied (condition = "New", status = "SHELF")
- Batch can be NULL
- Dates can be partial (manufacturing only, or expiry only)

## Configuration

### Item Master Prerequisites
For an item to use serial number tracking:

```javascript
// In ItemMaster:
{
  serialnumbertracking: true,      // Must be enabled
  duplicateserialnumber: false,    // Whether to allow duplicates (optional)
  ordertype: "WEEKLY",             // Order type for planning
  discountpercentage: 5.50         // Discount % if applicable
}
```

## Error Handling

The system handles:
- Missing required fields
- Invalid item (not found)
- Serial tracking not enabled
- Duplicate serial numbers
- Database errors
- Partial batch failures (doesn't stop entire operation)

Each error is reported with row number for easy debugging.

## Future Enhancements

1. **Serial Number Import**: CSV upload for bulk serial numbers
2. **Barcode Generation**: Auto-generate/print barcodes for serials
3. **Warranty Management**: Track warranty claims by serial
4. **Batch Recalls**: Bulk action on serial numbers by batch
5. **Serial Verification**: Verify serial number authenticity through API
6. **Stock Tracking**: Real-time stock by serial number status

## Testing Checklist

- [ ] Button appears only in invoice-plus mode
- [ ] Popup opens when button clicked
- [ ] Item selector works
- [ ] Fields accept input correctly
- [ ] Required field validation works
- [ ] Date fields accept valid dates
- [ ] API endpoint returns correct response
- [ ] Database records created correctly
- [ ] Duplicate detection works
- [ ] Success messages display
- [ ] Error messages display with row numbers
- [ ] "Save & Next Item" moves to next item
- [ ] Can navigate back to previous items
- [ ] Close button closes popup
- [ ] Soft delete works (deletedat tracking)
