# Item 888414 Search Debug - Test Guide

## Quick Test

1. **Start backend:**
```bash
cd c:\Ashok\ERP\Project1NodeJS\backend
node server.js
```

2. **In another terminal, test the search:**
```bash
curl "http://localhost:5000/services/debug/search-item/888414"
```

3. **Look for the analysis section** - it will show:
   - `inItemMaster`: ✅ true or ❌ false
   - `inItemDetail`: ✅ true or ❌ false  
   - `itemDetailForUserBranch`: ✅ true or ❌ false (for branch 3)
   - `itemDetailNotDeleted`: ✅ true or ❌ false
   - `searchReturned`: ✅ true or ❌ false

---

## What Each Result Means

### ✅ All TRUE
- Item is in itemmaster
- Item is in itemdetail
- Item is in branch 3
- Item is not deleted
- **Search should return it** ✅
- **Problem location**: Frontend not loading items on dropdown open

### ❌ searchReturned=false but others=true
- Item exists in the right place
- **Query logic is wrong** or column issue
- Check the "tests" output for details

### ❌ itemDetailForUserBranch=false
- Item is in itemdetail but NOT for branch 3
- Need to add item to branch 3 itemdetail

### ❌ itemDetailNotDeleted=false
- Item is marked as deleted in itemdetail
- Run: `UPDATE itemdetail SET deletedat=NULL WHERE ...`

---

## Expected Response Format

```json
{
  "success": true,
  "data": {
    "partnumber": "888414",
    "userBranchId": 3,
    "tests": {
      "itemMasterCheck": {
        "found": 1,
        "items": [...]
      },
      "itemDetailCheck": {
        "found": 5,
        "items": [...several branches...]
      },
      "searchQueryResult": {
        "found": 1,
        "items": [...]
      }
    },
    "analysis": {
      "inItemMaster": true,
      "inItemDetail": true,
      "searchReturned": true,
      "itemDetailForUserBranch": true,
      "itemDetailNotDeleted": true
    }
  }
}
```

---

## Troubleshooting

### If searchReturned=false but inItemDetail=true
- Check the SQL column matching (stock qty column)
- Verify itemid data types match (int vs bigint)
- Check for hidden characters in partnumber

### If itemDetailForUserBranch=false
```sql
-- Add item to branch 3
INSERT INTO itemdetail (itemid, branchid, quantityonhand, createdby, createdat)
VALUES (
  (SELECT itemid FROM itemmaster WHERE partnumber = '888414'),
  3,
  39,
  1,
  CURRENT_TIMESTAMP
);
```

### If itemDetailNotDeleted=false
```sql
-- Un-delete the item
UPDATE itemdetail
SET deletedat = NULL
WHERE itemid = (SELECT itemid FROM itemmaster WHERE partnumber = '888414')
AND branchid = 3;
```

---

## Also Check

After getting results from debug endpoint, also check:

1. **Is the frontend calling the API on dropdown open?**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Open Invoice+ dropdown
   - Check if `/items-services/search?q=` request is made

2. **What does the response look like?**
   - Click the request in Network tab
   - Check the Response tab
   - Should show items array with count > 0

3. **Any JavaScript errors?**
   - Go to Console tab
   - Look for red errors
   - Check the error message

---

## Steps to Fix (After Diagnosis)

1. Run debug endpoint → get results
2. Share the `analysis` section with findings
3. Apply the appropriate SQL fix IF needed
4. Restart backend
5. Test in Invoice+ dropdown

Ready to test!
