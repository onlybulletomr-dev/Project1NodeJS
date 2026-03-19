# Render Deployment - Service ID Migration

## Step 1: ✅ Code Deployment (COMPLETED)
The code changes have been pushed to GitHub and Render will auto-deploy:
- **Commit**: Fix invoice items: use serviceid 1,2,3 for general service
- **Files Updated**:
  - `backend/config/db.js`
  - `backend/models/InvoiceDetail.js`
  - `backend/models/InvoiceMaster.js`
  - `frontend/src/components/InvoiceForm.js`
  - `frontend/src/components/InvoiceList.js`

**Wait for Render deployment to complete** (check your Render dashboard)

---

## Step 2: Execute Database Migration on Render

You have two options:

### Option A: Using Render's PostgreSQL CLI (Recommended)

1. Go to Render Dashboard → Select your PostgreSQL database
2. Click "PSQL" or "PostgreSQL CLI" button
3. Run this SQL command:

```sql
-- Renumber all service IDs starting from 1
WITH numbered_services AS (
  SELECT serviceid, ROW_NUMBER() OVER (ORDER BY serviceid) as new_id
  FROM servicemaster
)
UPDATE servicemaster SET serviceid = numbered_services.new_id
FROM numbered_services
WHERE servicemaster.serviceid = numbered_services.serviceid;

-- Verify changes
SELECT MIN(serviceid) as min_id, MAX(serviceid) as max_id, COUNT(*) as total_count
FROM servicemaster;

-- Reset the sequence (replace 89 with your max_id + 1)
ALTER SEQUENCE servicemaster_serviceid_seq RESTART WITH 89;
```

### Option B: Via Local Terminal (Using Render Connection String)

From your local machine, run:

```bash
# Run migration script using Render database
RENDER_DB_HOST=your-db-host-here.postgres.render.com \
RENDER_DB_PORT=5432 \
RENDER_DB_USER=postgres_user \
RENDER_DB_PASSWORD='your-password' \
RENDER_DB_NAME=project1db_nrlz \
node migrateServiceIds.js
```

---

## What Changes Were Made

### Backend Changes
1. **InvoiceMaster.js** - Added phone number fields to invoice retrieval queries
2. **InvoiceDetail.js** - JOINs with itemmaster/servicemaster to get proper descriptions
3. **config/db.js** - Fixed .env path loading

### Frontend Changes
1. **InvoiceForm.js** - General Service now uses serviceid 1, 2, 3
2. **InvoiceList.js** - Shows customer phone and proper item descriptions

### Database Changes
- Service IDs renumbered from 1 to 88 (instead of 340+)
- Sequence reset to continue from next available ID

---

## Verification

After migration, test that:
- ✅ General Service items are from serviceid 1, 2, 3
- ✅ Invoice view shows customer phone number
- ✅ Invoice items show actual part/service numbers and descriptions
- ✅ New services auto-increment correctly

---

## Rollback (if needed)

If you need to rollback the database changes:

```sql
-- This will restore service IDs to their previous values
-- You'll need the backup/original values
-- Contact support if needed
```
