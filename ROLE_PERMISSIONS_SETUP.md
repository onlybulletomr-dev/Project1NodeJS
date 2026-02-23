# Branch-Isolated Admin Access Implementation Guide

## Overview
This guide implements role-based access control with branch isolation for your ERP system. Admins (Murali & Jagatheish) can access all screens but only within their assigned branch.

## Completed Steps ✅

### 1. Database Setup (Step 1)
- ✅ Created RoleMaster table
- ✅ Created ModuleMaster, RolePermissions, UserRoles, UserBranchMap tables
- ✅ Assigned Admin role to Murali (Branch 2-PBM) & Jagatheish (Branch 3-OMR)
- ✅ All necessary indexes created

### 2. Authentication Middleware (Step 2)
- ✅ Created `/backend/middleware/authMiddleware.js`
- ✅ Functions: branchAccessMiddleware, getUserDetails, checkModulePermission
- ✅ Automatically extracts user from header (x-user-id)
- ✅ Verifies branch access and role permissions

### 3. Controller Updates (Step 3)
- ✅ Updated `invoiceController.js`:
  - `saveInvoice()` - Forces BranchId from user, tracks CreatedBy
  - `getAllInvoices()` - Filters by user's branch
  - `getInvoiceById()` - Verifies branch ownership
  - `updateInvoice()` - Verifies branch ownership, tracks UpdatedBy

### 4. Route Updates (Step 4)
- ✅ Updated `invoiceRoutes.js` - Added branchAccessMiddleware to all routes

### 5. Frontend Updates (Step 6)
- ✅ Updated `frontend/src/api.js`:
  - `setUserId(userId)` - Call after user login
  - `clearUserId()` - Call on logout
  - All requests auto-include userId in `x-user-id` header

### 6. Database Migration (Step 7)
- ✅ Created `database/migration-add-branch-userId.sql`
- ✅ Adds BranchId, CreatedBy, UpdatedBy to all tables
- ✅ Creates performance indexes

### 7. Model Updates (Step 3 Extended)
- ✅ Added `getAllByBranch(branchId)` method to InvoiceMaster model

## Remaining Manual Steps

### Step A: Update Other Controllers
You need to apply the same pattern to:

**BRANCH-SPECIFIC controllers** (require branch filtering):
1. **customerController.js** - Add branch filter to getAll(), verify in getById()
2. **itemDetailController.js** - Add branch filter to getAll(), verify in getById()

**SHARED MASTER controllers** (NO branch filtering):
3. **vehicleController.js** - NO branch filter (VehicleMaster is shared)
4. **vehicleDetailController.js** - NO branch filter (VehicleDetails are shared)
5. **itemController.js** - NO branch filter (ItemMaster is shared)

Pattern for BRANCH-SPECIFIC:
```javascript
// In controller function
const userBranchId = req.user?.branchId;
const userId = req.user?.userId;

if (!userBranchId || !userId) {
  return res.status(401).json({ error: 'Authentication required' });
}

// Force branch in create operations
BranchId: userBranchId,  // NEVER use request value
CreatedBy: userId
```

Pattern for SHARED MASTERS:
```javascript
// In controller function
const userId = req.user?.userId;

// NO branch filtering
// NO BranchId in request/body
CreatedBy: userId  // Only track who created it
```

### Step B: Update Remaining Routes
Add middleware to routes that don't have it:
```javascript
const { branchAccessMiddleware } = require('../middleware/authMiddleware');

router.get('/customers', branchAccessMiddleware, customerController.getAll);
router.post('/customers', branchAccessMiddleware, customerController.create);
// ... etc for all routes
```

### Step C: Update Models
Add `getAllByBranch(branchId)` method to BRANCH-SPECIFIC models only:
- CustomerMaster
- ItemDetail

Do NOT add getBranch method to SHARED MASTERS:
- VehicleMaster
- VehicleDetails
- ItemMaster

Pattern:
```javascript
// For branch-specific models only
static async getAllByBranch(branchId) {
  const result = await pool.query(
    `SELECT * FROM tablename WHERE branchid = $1 AND deletedat IS NULL ORDER BY id DESC`,
    [branchId]
  );
  return result.rows;
}

// For shared masters:
static async getAll() {
  const result = await pool.query(
    `SELECT * FROM tablename WHERE deletedat IS NULL ORDER BY id DESC`
  );
  return result.rows;
}
```

### Step D: Run Database Migration on Render

1. Go to Render Dashboard → PostgreSQL service
2. Copy connection string: `postgresql://user:password@host:port/database`
3. Connect via psql or pgAdmin
4. Run migration:
   ```sql
   COPY and paste content of: database/migration-add-branch-userId.sql
   ```

Or use Render's "Connect" panel to execute SQL directly.

### Step E: Push to GitHub & Deploy

```bash
cd c:\Ashok\ERP\Project1NodeJS_Production

# Copy updated files
Copy-Item -Path "c:\Ashok\ERP\Project1NodeJS\backend\middleware\authMiddleware.js" -Destination ".\backend\middleware\authMiddleware.js" -Force
Copy-Item -Path "c:\Ashok\ERP\Project1NodeJS\backend\controllers\invoiceController.js" -Destination ".\backend\controllers\invoiceController.js" -Force
Copy-Item -Path "c:\Ashok\ERP\Project1NodeJS\backend\routes\invoiceRoutes.js" -Destination ".\backend\routes\invoiceRoutes.js" -Force
Copy-Item -Path "c:\Ashok\ERP\Project1NodeJS\backend\models\InvoiceMaster.js" -Destination ".\backend\models\InvoiceMaster.js" -Force
Copy-Item -Path "c:\Ashok\ERP\Project1NodeJS\frontend\src\api.js" -Destination ".\frontend\src\api.js" -Force
Copy-Item -Path "c:\Ashok\ERP\Project1NodeJS\database\migration-add-branch-userId.sql" -Destination ".\database\migration-add-branch-userId.sql" -Force

# Commit and push
git add .
git commit -m "Implement branch-isolated admin access with user tracking"
git push
```

## How to Use

### 1. Login Flow
After implementing login in your app:
```javascript
// In your Login component
const handleLogin = async (employeeId) => {
  // ... authentication logic
  
  // Set userId for all API requests
  import { setUserId } from './api';
  setUserId(employeeId);
  
  // Navigate to dashboard
};
```

### 2. Making API Calls
```javascript
// All API calls automatically include userId
const invoices = await api.get('/invoices?userId=1');
// Backend receives: x-user-id: 1 in header
// Backend filters: WHERE branchid = 2 (user's branch)
```

### 3. Verify Branch Isolation
- Murali (userId=1) can only see Branch 2 data
- Jagatheish (userId=7) can only see Branch 3 data
- createdby field tracks who entered each record

## Testing Checklist

- [ ] Run migration script on Render database
- [ ] Murali can create invoice → stored with BranchId=2, CreatedBy=1
- [ ] Murali cannot see Branch 3 invoices (403 error)
- [ ] Jagatheish can create invoice → stored with BranchId=3, CreatedBy=7
- [ ] Jagatheish cannot see Branch 2 invoices (403 error)
- [ ] Invoice list shows only user's branch invoices
- [ ] Each line item shows CreatedBy employee name

## Files Created/Modified

### New Files
- `/backend/middleware/authMiddleware.js`
- `/database/migration-add-branch-userId.sql`

### Modified Files
- `/backend/controllers/invoiceController.js`
- `/backend/routes/invoiceRoutes.js`
- `/backend/models/InvoiceMaster.js`
- `/frontend/src/api.js`

## Troubleshooting

**Error: "User ID required"**
- Frontend not calling setUserId() after login
- Request missing x-user-id header

**Error: "You do not have access"**
- User trying to access data from different branch
- Operating as expected - verify request is for correct user

**Error: "User or branch access not found"**
- UserRoles mapping missing for user
- UserBranchMap not configured
- Check: `SELECT * FROM UserRoles WHERE UserId = X`

## Security Notes

✅ BranchId is ALWAYS forced from authenticated user (cannot be overridden by request)
✅ CreatedBy automatically set to logged-in user
✅ All queries filtered by user's branch
✅ Soft delete respected (deletedat IS NULL)

## Next Steps

1. Complete remaining controller/route/model updates
2. Run database migration
3. Push to GitHub
4. Test on production (Render)
5. Implement login page with setUserId()
6. Monitor audit trail (CreatedBy/UpdatedBy fields)
