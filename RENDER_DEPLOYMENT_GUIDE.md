# Render Deployment Guide

## 🚀 Step 1: Configure Render for Auto-Deployment (5 minutes)

### In Render Dashboard:

1. **Go to your Backend Service**
   - Log in to https://dashboard.render.com
   - Click on your backend service (likely named `project1nodejs-backend` or similar)

2. **Settings → GitHub Integration**
   - Scroll down to "Repository"
   - Click "Connect repository"
   - Select your GitHub repo: `onlybulletomr-dev/Project1NodeJS`
   - Click "Connect"

3. **Settings → Auto-Deploy**
   - Find "Auto-Deploy" section
   - Set to: **"Yes"** - deploy every push to main branch
   - This will automatically deploy when you push to GitHub

4. **Save Settings**

---

## ✅ Step 2: Monitor Deployment (5-10 minutes)

### What Happens Next:

1. **Render detects your push**
   - Webhook triggered automatically
   - Deployment starts within 1-2 minutes

2. **Watch the Build**
   - Go to "Events" tab in your service
   - You'll see:
     ```
     ✓ Building...
     ✓ npm install (installs bcrypt)
     ✓ Build successful
     ✓ Deploying...
     ✓ Service deployed
     ```

3. **Expected Logs:**
   ```
   [Startup] ✅ EmployeeCredentials migration completed successfully!
   Server running on port 5000
   Connected to database...
   ```

### ⚠️ If Build Fails:
- Click on the failed deployment
- Check "Logs" tab for error messages
- Common issues:
  - Missing Node version
  - Environment variables not set
  - Database connection timeout

---

## 🔧 Step 3: Run Database Migration on Render

Once deployment succeeds, you need to create the `processedfiles` table:

### Option A: CLI (If you have Render CLI)
```bash
render run --service-id=<your-service-id> cmd "node createProcessedFilesTableFinal.js"
```

### Option B: SSH into Render Backend
```bash
ssh into your Render service backend
cd /opt/project1nodejs/backend
node createProcessedFilesTableFinal.js
```

### Option C: Manual via Render Shell
1. In Render Dashboard → Your Service
2. Click "Shell" tab
3. Run:
   ```bash
   cd backend
   node createProcessedFilesTableFinal.js
   ```

### Expected Output:
```
Creating processedfiles table...
✓ processedfiles table created successfully
✓ Index created on billno
```

---

## 🧪 Step 4: Test in Production

### Test Case 1: Initial Invoice Upload
```
1. Open your production frontend
2. Go to Inventory → Update Items → Upload Invoice
3. Select your PDF (abc.pdf)
4. Expected: ✅ Successfully parsed 4 items
5. Check backend logs: 📋 Found Bill No: T/31063
```

### Test Case 2: Duplicate Detection
```
1. Upload the SAME PDF again
2. Expected: ⚠️ Dialog appears:
   "This invoice (Bill No: T/31063) was already processed..."
3. Check backend logs: ⚠️  Duplicate invoice detected: Bill No T/31063
```

### Test Case 3: Password Verification
```
1. In password dialog, enter Ashok's password
2. Click "Verify Password"
3. Expected: ✅ "Password Verified"
4. Check backend logs: ✅ Password verified for user Ashok
5. Click "Proceed with Reprocessing"
6. Expected: Items parse and display again
```

### Test Case 4: Wrong Password
```
1. Try wrong password
2. Expected: ❌ "Incorrect password" error
3. Dialog stays open for retry
```

---

## 📊 Production Monitoring

### Watch These Logs:
```
✅ 📋 Found Bill No: T/31063 → Bill No extracted
✅ ⚠️  Duplicate invoice detected → Duplicate check working
✅ 🔐 Attempting password verification → Password flow started
✅ ✅ Password verified for user Ashok → Authorization successful
✅ ✓ Deleted 1 record(s) from processedfiles → Ready to reprocess
```

### Common Production Issues:

**Issue**: "relation processedfiles does not exist"
```
Solution: Run migration: node createProcessedFilesTableFinal.js
```

**Issue**: "User Ashok not found"
```
Check: SELECT * FROM employeemaster WHERE firstname='Ashok';
Note: Database might use firstname/lastname not employeename
```

**Issue**: "Incorrect password" always
```
Check: SELECT * FROM employeecredentials WHERE employeeid=12;
Verify: Ashok has passwordhash (not NULL)
```

---

## 🔍 Render Dashboard Monitoring

### Real-time Logs:
- Dashboard → Your Service → Logs
- Shows live backend output
- Useful for debugging

### Metrics:
- Dashboard → Your Service → Metrics
- Monitor CPU, memory, requests
- Should show normal usage

### Environment Variables:
- Dashboard → Your Service → Environment
- Check DATABASE_URL is correct
- Verify other secrets are set

---

## ✨ Checklist Before Going Live

- [ ] Changes pushed to GitHub main branch
- [ ] Render auto-deploy configured
- [ ] Deployment completed successfully
- [ ] No build errors in Render logs
- [ ] Database migration ran: `node createProcessedFilesTableFinal.js`
- [ ] processedfiles table created: `SELECT * FROM processedfiles;`
- [ ] Test #1: Initial upload succeeds
- [ ] Test #2: Duplicate shows password dialog
- [ ] Test #3: Password verification works
- [ ] Test #4: Invoice reprocesses after password
- [ ] Logs show all expected messages
- [ ] Monitor production for 1-2 hours

---

## 🎯 Next Steps

### Complete These in Order:

1. **TODAY**
   - [ ] Configure Render auto-deploy (if not done)
   - [ ] Verify deployment succeeded
   - [ ] Run database migration
   - [ ] Run all 4 tests

2. **THIS WEEK**
   - [ ] Monitor logs daily for errors
   - [ ] Have users test the feature
   - [ ] Document any issues
   - [ ] Create runbook for support

3. **ONGOING**
   - [ ] Regular database backups
   - [ ] Monitor Render metrics
   - [ ] Track performance
   - [ ] Plan feature improvements

---

## 📞 If You Need Help

### Check These Files:
- `DEPLOYMENT_CHECKLIST.md` → Step-by-step guide
- `BACKUP_MANIFEST.md` → Details of all changes
- Render logs → Real-time error messages

### Common Render Commands:
```bash
# SSH into service
render ssh -s <service-id>

# View logs
render logs -s <service-id>

# Restart service
render restart -s <service-id>

# Check status
render status -s <service-id>
```

---

## 🎉 Success Criteria

You know deployment is successful when:

✅ Frontend loads without errors  
✅ PDF upload works (no 500 errors)  
✅ Duplicate detection shows 409 + dialog  
✅ Password verification works  
✅ Invoice reprocesses with new items  
✅ All logs show expected messages  
✅ Users can use the feature  

---

**Created**: March 4, 2026  
**Status**: Ready for Production Deployment
