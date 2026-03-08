# Item 888414 Missing from Invoice+ Dropdown - Diagnostic Guide

## Problem
Item 888414 has 39 qty in the database but is NOT showing in Invoice+ dropdown.

## Root Cause (Most Likely)
Item 888414 **exists in itemmaster** but **does NOT exist in itemdetail** table for your current branch.

Invoice+ mode queries itemdetail (not itemmaster), so items must exist in itemdetail to show up.

---

## How to Check

### Option 1: Use Debug Endpoint (Easiest)

1. Start backend:
```bash
cd backend
node server.js
```

2. In another terminal, run:
```bash
curl "http://localhost:5000/services/debug/item/888414"
```

3. Check the response:
   - ✅ **If it shows "exists in itemdetail"**: Item is in the right place
   - ⚠️ **If it shows "NOT in itemdetail for branch X"**: Item needs to be added to itemdetail
   - ❌ **If it shows "not found in itemmaster"**: Item doesn't exist at all

### Option 2: Direct SQL Queries

```sql
-- Check if item exists in itemmaster
SELECT itemid, partnumber, itemname, deletedat 
FROM itemmaster 
WHERE partnumber = '888414';

-- Check if item exists in itemdetail (all branches)
SELECT itemdetailid, branchid, quantityonhand, qtyonhand, quantity, qty, deletedat
FROM itemdetail
WHERE itemid = (SELECT itemid FROM itemmaster WHERE partnumber = '888414');

-- Check if item exists in itemdetail for your branch (e.g., branch 1)
SELECT itemdetailid, branchid, quantityonhand, qtyonhand, quantity, qty, deletedat
FROM itemdetail
WHERE itemid = (SELECT itemid FROM itemmaster WHERE partnumber = '888414')
AND branchid = 1;
```

---

## Solutions

### Issue #1: Item NOT in itemdetail at all
```sql
-- Add item 888414 to itemdetail for your branch
INSERT INTO itemdetail (itemid, branchid, quantityonhand, createdby, createdat)
VALUES (
  (SELECT itemid FROM itemmaster WHERE partnumber = '888414'),
  1,  -- Change to your branch ID
  39, -- Set the qty
  1,  -- createdby (user ID)
  CURRENT_TIMESTAMP
);
```

### Issue #2: Item in itemdetail but marked as deleted
```sql
-- Un-soft-delete the item
UPDATE itemdetail
SET deletedat = NULL
WHERE itemid = (SELECT itemid FROM itemmaster WHERE partnumber = '888414')
AND branchid = 1;
```

### Issue #3: Item qty is 0
```sql
-- Update qty to 39
UPDATE itemdetail
SET quantityonhand = 39
WHERE itemid = (SELECT itemid FROM itemmaster WHERE partnumber = '888414')
AND branchid = 1;
```

### Issue #4: Item in wrong branch
```sql
-- Check which branches have this item
SELECT branchid, quantityonhand
FROM itemdetail
WHERE itemid = (SELECT itemid FROM itemmaster WHERE partnumber = '888414');

-- If needed, add it to your branch
INSERT INTO itemdetail (itemid, branchid, quantityonhand, createdby, createdat)
VALUES (
  (SELECT itemid FROM itemmaster WHERE partnumber = '888414'),
  YOUR_BRANCH_ID,
  39,
  1,
  CURRENT_TIMESTAMP
);
```

---

## Why This Happens

### Invoice Screen
- **Data Source**: itemmaster (all items)
- **Filter**: `deletedat IS NULL` in itemmaster only
- **Result**: Shows ALL items including those with 0 qty

### Invoice+ Screen
- **Data Source**: itemdetail (filtered items with qty)
- **Filters**: 
  - Must exist in itemdetail
  - `deletedat IS NULL` in BOTH itemdetail AND itemmaster
  - **branchid = current_user_branch**
- **Result**: Shows only items that are stocked in your branch

---

## After Fixing

1. Restart backend:
```bash
taskkill /IM node.exe /F
cd backend && node server.js
```

2. Go to Invoice+ screen
3. Search for "888414" 
4. Item should now appear in dropdown
5. Should show qty validation if qty < requested amount

---

## Testing the Fix

### Test 1: Item appears in dropdown
```
Search for: "888414"
Expected: Item 888414 appears with qty showing available stock
```

### Test 2: Qty validation works
```
Select item 888414
Enter qty: 50 (more than available 39)
Expected: ⚠️ Warning: "Cannot add... Available qty: 39"
```

### Test 3: Can add with valid qty
```
Select item 888414
Enter qty: 30 (less than 39)
Expected: ✓ Item added to grid
```

---

## Debug Endpoint Responses

### Response if item missing from itemdetail:
```json
{
  "success": true,
  "data": {
    "partnumber": "888414",
    "itemid": 12345,
    "itemMaster": {
      "exists": true,
      "isDeleted": false
    },
    "itemDetailInUserBranch": {
      "records": [],
      "count": 0
    },
    "message": "⚠️ Item 888414 (ID: 12345) exists in itemmaster but NOT in itemdetail for branch 1"
  }
}
```

### Response if item exists in itemdetail:
```json
{
  "success": true,
  "data": {
    "partnumber": "888414",
    "itemid": 12345,
    "itemMaster": {
      "exists": true,
      "isDeleted": false
    },
    "itemDetailInUserBranch": {
      "records": [
        {
          "itemdetailid": 5678,
          "branchid": 1,
          "quantityonhand": 39,
          "deletedat": null
        }
      ],
      "count": 1
    },
    "message": "✓ Item 888414 found in itemdetail for branch 1"
  }
}
```

---

## Next Steps

1. Run the debug endpoint: `curl http://localhost:5000/services/debug/item/888414`
2. Send me the JSON response
3. Based on the response, apply the appropriate SQL fix
4. Restart backend
5. Test in Invoice+ screen

---

**Status**: Ready to diagnose. Use the debug endpoint to identify the root cause.
