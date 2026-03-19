# Logo Sync Script - How to Use

This script syncs company logo data from your **local database** to **Render database**.

## Quick Start

### Step 1: Go to project root
```bash
cd c:\Ashok\ERP\Project1NodeJS
```

### Step 2: Run the sync script
```bash
node syncLogoToRender.js
```

## Configuration

The script needs to connect to both databases. It will automatically use:

**Local Database (reads from):**
- Default: `localhost:5432` with user `postgres`
- Or set environment variables:
  ```bash
  set LOCAL_DB_USER=postgres
  set LOCAL_DB_PASSWORD=your_password
  set LOCAL_DB_HOST=localhost
  set LOCAL_DB_PORT=5432
  set LOCAL_DB_NAME=project1db
  ```

**Render Database (writes to):**
- Uses `DATABASE_URL` environment variable (if already set in .env)
- Or explicitly set:
  ```bash
  set DATABASE_URL=postgresql://user:password@host:port/database
  ```

## What It Does

1. ✅ Connects to your local PostgreSQL database
2. ✅ Reads all company records that have logo data
3. ✅ Connects to your Render PostgreSQL database  
4. ✅ Updates each company with the logo data
5. ✅ Shows a summary of synced companies

## Example Output

```
🔄 Starting logo data sync...

📡 Connecting to databases...
✅ Connected to LOCAL database
✅ Connected to RENDER database

📥 Fetching company data from LOCAL database...
✅ Found 3 companies with logos

📤 Syncing logos to RENDER database...

  Syncing: ONLY BULLET (ID: 1)...
    ✅ Synced (2.30 MB)

  Syncing: Company B (ID: 2)...
    ✅ Synced (2.30 MB)

  Syncing: Company C (ID: 3)...
    ✅ Synced (2.30 MB)

============================================================
📊 Sync Summary:
   ✅ Successfully synced: 3
   ❌ Failed: 0
============================================================

✅ All logos synced successfully to Render!
   You can now see logos in your print previews on Render.
```

## Troubleshooting

### Local Database Connection Error
Make sure:
- PostgreSQL is running locally
- Check if user/password/database name are correct
- Can you connect locally with pgAdmin or `psql`?

### Render Database Connection Error
Make sure:
- DATABASE_URL environment variable is set correctly
- Check Render dashboard for the correct connection string
- Test connection with pgAdmin or command line

### No logos found
- Make sure you ran `storeLogoInDatabase.js` locally first
- Check that `companymaster.logoimagepath` has data

## Next Steps

After syncing:
1. Go to your Render frontend URL
2. Test print/preview functionality
3. Logos should now display correctly
