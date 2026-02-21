# Project1 ERP - Render Deployment Guide

## Current Setup
- **Source Code**: `C:\Ashok\ERP\Project1NodeJS` - Your development folder
- **Production Deploy**: `C:\Ashok\ERP\Project1NodeJS_Production` - Ready for Render
- **Status**: Git initialized and ready to push

---

## Step 1: Create GitHub Repository

### 1.1 Create a new repository on GitHub
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `Project1NodeJS` (or your choice)
3. Description: "ERP System - Node.js + React + PostgreSQL"
4. Choose **Public** (so your friend can access it without auth)
5. **Do NOT** initialize with README/gitignore (we already have them)
6. Click **Create repository**

### 1.2 Copy the HTTPS URL
On the new repo page, you'll see:
```
https://github.com/YOUR-USERNAME/Project1NodeJS.git
```

---

## Step 2: Push Code to GitHub

Run these commands in PowerShell:

```powershell
cd C:\Ashok\ERP\Project1NodeJS_Production

# Add remote origin (replace with your repo URL)
git remote add origin https://github.com/YOUR-USERNAME/Project1NodeJS.git

# Rename branch to main (Render expects main)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Done!** Your code is now on GitHub.

---

## Step 3: Deploy Backend to Render

### 3.1 Sign up at [render.com](https://render.com)
1. Go to render.com
2. Click "Sign up"
3. Connect with GitHub (easiest way)
4. Authorize GitHub access

### 3.2 Create Backend Service
1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **+ New** → **Web Service**
3. Connect your GitHub repo (`Project1NodeJS`)
4. Configuration:
   - **Name**: `project1-backend`
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`

### 3.3 Add Environment Variables
In Render dashboard, scroll to "Environment":
```
DB_HOST = your-postgres-host.render.com
DB_PORT = 5432
DB_USER = postgres
DB_PASSWORD = your-secure-password
DB_NAME = project1db
NODE_ENV = production
SERVER_PORT = 5000
CORS_ORIGIN = https://project1-frontend.onrender.com
```

### 3.4 Create PostgreSQL Database
1. In Render dashboard → **+ New** → **PostgreSQL**
2. **Name**: `project1-postgres`
3. **Database**: `project1db`
4. **User**: `postgres`
5. Save the credentials
6. Copy the connection string

### 3.5 Link Database to Backend
1. Go to your backend service
2. Add environment variables from PostgreSQL connection details

**Your backend will be at**: `https://project1-backend.onrender.com`

---

## Step 4: Deploy Frontend to Render

### 4.1 Create Static Site
1. Render dashboard → **+ New** → **Static Site**
2. Connect the same GitHub repo
3. Configuration:
   - **Name**: `project1-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`

### 4.2 Add Environment Variables
```
REACT_APP_API_URL = https://project1-backend.onrender.com/api
```

### 4.3 Deploy
Click **Deploy** and wait (takes 2-5 minutes)

**Your frontend will be at**: `https://project1-frontend.onrender.com`

---

## Step 5: Verify Deployment

1. Visit `https://project1-frontend.onrender.com`
2. Click "Payment" tab
3. Verify it loads the unpaid invoices
4. Try the Pay button
5. Share the URL with your friend!

---

## Step 6: Continuous Development

### Update code locally:
```powershell
cd C:\Ashok\ERP\Project1NodeJS  # Your development folder
# Make changes...
# Test locally
```

### Sync to Production when ready:
```powershell
# Copy updated files
robocopy C:\Ashok\ERP\Project1NodeJS C:\Ashok\ERP\Project1NodeJS_Production /S /E

# Commit & push
cd C:\Ashok\ERP\Project1NodeJS_Production
git add .
git commit -m "Update: [describe your changes]"
git push origin main
```

Render will automatically redeploy!

---

## Important Notes

⚠️ **Free Tier Limitations**:
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid ($7/month) if you want always-on

✅ **Best Practices**:
- Keep `.env` in `.gitignore` (never commit credentials)
- Use Render's environment variables for secrets
- Test locally before pushing to GitHub
- Keep `Project1NodeJS_Production` in sync with `Project1NodeJS`

---

## Troubleshooting

**Backend won't connect to database?**
- Check DB credentials in Render environment variables
- Ensure PostgreSQL service is running
- Check Render logs for errors

**Frontend shows blank page?**
- Check browser console for API errors (F12)
- Verify `REACT_APP_API_URL` is correct
- Check CORS settings in backend

**Need to revert a deployment?**
- Render keeps deployment history
- Click previous deployment and redeploy

---

## Support
For issues, check Render logs:
1. Go to Render dashboard
2. Click your service
3. Scroll to **Logs** section
4. Look for error messages

Good luck! 🚀
