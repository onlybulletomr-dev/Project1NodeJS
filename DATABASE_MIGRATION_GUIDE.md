# Database Migration Guide: Local to Render

This script migrates your local PostgreSQL database to Render's PostgreSQL instance.

## Step 1: Get Your Render Database Credentials

1. Go to https://dashboard.render.com
2. Click on your **PostgreSQL database** service (look for "project1-db" or similar)
3. In the **Info** section, find and copy these values:
   - **External Database URL** - this contains all credentials
   - Format: `postgresql://username:password@hostname:5432/dbname`

**Or manually copy each field:**
- Hostname (External URL)
- Port (usually 5432)
- Database
- Username  
- Password

## Step 2: Set Environment Variables

### Using .env file (RECOMMENDED)
Add these to your `backend/.env`:

```env
# Render Database Credentials
RENDER_DB_HOST=your-render-hostname.postgres.render.com
RENDER_DB_PORT=5432
RENDER_DB_USER=your_render_username
RENDER_DB_PASSWORD=your_render_password
RENDER_DB_NAME=your_render_database
```

### Using PowerShell (Alternative)
```powershell
$env:RENDER_DB_HOST="your-render-hostname.postgres.render.com"
$env:RENDER_DB_PORT="5432"
$env:RENDER_DB_USER="your_render_username"
$env:RENDER_DB_PASSWORD="your_render_password"
$env:RENDER_DB_NAME="your_render_database"
```

## Step 3: Run the Migration

```bash
cd backend
node migrateLocalToRender.js
```

## Expected Output

```
[Migration] Starting data migration from local to Render...
[Migration] Connected to both databases
[Migration] Fetching data from local database...
[Migration] Found X customers
[Migration] Found Y vehicles
[Migration] Found Z invoices
[Migration] Clearing Render database tables...
[Migration] ✓ Render tables cleared
[Migration] Inserting customers to Render...
[Migration] ✓ Inserted X customers
[Migration] Inserting vehicles to Render...
[Migration] ✓ Inserted Y vehicles
[Migration] Inserting invoices to Render...
[Migration] ✓ Inserted Z invoices
[Migration] ✅ Data migration completed successfully!
```

## Step 4: Verify

1. Refresh the Render frontend: https://project1-frontend-8abj.onrender.com (hard refresh with Ctrl+Shift+R)
2. Go to Customer screen - should see your local customers and vehicles!

## Troubleshooting

**"Render database credentials not set"**
- Double-check that all RENDER_DB_* environment variables are set
- Verify the credentials are correct from Render dashboard

**"Connection refused"**
- Make sure you're using the External hostname, not the internal one
- Check that Render database is running (status should be "Available")

**"Permission denied"**
- Verify the username and password are correct
- Make sure the username has proper permissions on the database

## Data Cleared?

The script clears existing Render data before inserting. If you want to keep it, modify the script to comment out these lines:
```
await renderClient.query('DELETE FROM paymentdetail');
await renderClient.query('DELETE FROM invoicedetail');
etc...
```
