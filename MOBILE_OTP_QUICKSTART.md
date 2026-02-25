# Mobile OTP Testing - Quick Start Guide

## Environment
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000
- **Time**: ~5 minutes for complete flow test

---

## Quick Test Flow

### 1️⃣ Open Forgot Password Page
```
http://localhost:3000/forgot-password
```

### 2️⃣ Request OTP
- **Enter Phone**: `9876543210` (any 10-digit number starting with 6-9)
- **Click**: "Send OTP" button
- **Expected**: Success message, transitions to Step 2

### 3️⃣ Get OTP from Backend
- Look at backend terminal/console
- Find the box with `========================================`
- Copy the 6-digit OTP number
- Example output:
  ```
  ========================================
  DEMO OTP for Murali Jagatheish
  Mobile: 9876543210
  OTP: 123456
  ========================================
  ```

### 4️⃣ Verify OTP
- **Enter OTP**: Paste the 6-digit code (e.g., 123456)
- **Check Display**: Should show "Sent to: ****3210"
- **Click**: "Verify OTP & Reset Password"
- **Expected**: Auto-redirect to reset password page

### 5️⃣ Reset Password
- **New Password**: `Test@1234` (must have 8+ chars, uppercase, lowercase, number)
- **Confirm**: Same password
- **Click**: "Reset Password"
- **Expected**: Success message, redirect to login in 2 seconds

### 6️⃣ Login with New Password
- **URL**: http://localhost:3000/login
- **Username**: Same as before (e.g., "Murali")
- **Password**: `Test@1234`
- **Click**: "Login"
- **Expected**: Login successful, redirect to dashboard

---

## Troubleshooting

### ❌ "No account found with provided details"
- Phone number not in database
- Try with a different phone format (add country code: +91 9876543210)
- Or use Employee ID instead

### ❌ OTP not appearing in backend console
- Backend might not be reloaded after code changes
- Restart backend server: `npm start` in backend directory
- Or kill all Node processes and restart

### ❌ "Invalid OTP format. Must be 6 digits"
- Make sure you're entering exactly 6 digits
- No spaces or letters

### ❌ Error after clicking "Verify OTP"
- Check that employee record exists in database
- Check that mobilenumber1 is not NULL
- Check backend console for actual error

---

## Test Variations

### Test with Employee ID (Alternative)
1. Leave phone empty
2. Enter Employee ID: `E001` (or valid ID)
3. Send OTP
4. Continue same as above

### Test Resend OTP
1. On Step 2, click "Resend OTP"
2. New OTP will appear in backend console
3. Use new OTP to verify

### Test Back Button
1. On Step 2, click "Back"
2. Returns to Step 1
3. Can restart the flow

### Test Phone Number Formats
Valid formats that should work:
- `9876543210` ✓
- `+91 9876543210` ✓
- `91 9876543210` ✓
- `9876 543210` ✓ (spaces auto-removed)

Invalid formats:
- `1876543210` ✗ (starts with 1)
- `98765432` ✗ (too short)
- `9876543210123` ✗ (too long)

---

## Success Indicators

✅ Phone input accepts valid numbers  
✅ OTP request generates demo OTP  
✅ OTP display shows masked phone  
✅ OTP verification works  
✅ Password reset page loads  
✅ New password accepted  
✅ Login works with new password  

---

## Files to Check If Issues Occur

1. **Backend running?**
   - Check: http://localhost:5000/health
   - Should see proper health response

2. **Frontend running?**
   - Check: http://localhost:3000
   - Should load the app

3. **Backend console**
   - Should show request logs
   - Should show OTP when forgot-password is called

4. **Browser console (F12)**
   - Check for any JavaScript errors
   - Check network tab for API responses

---

## Commands to Run

### Restart Backend
```bash
cd c:\Ashok\ERP\Project1NodeJS\backend
npm start
# Should output: "Server is running successfully"
```

### Restart Frontend
```bash
cd c:\Ashok\ERP\Project1NodeJS\frontend
npm start
# Should show React compilation success
```

### Check Employee Data
```bash
cd c:\Ashok\ERP\Project1NodeJS\backend
node checkEmployeeMasterStructure.js
```

### View OTP in Backend (Windows PowerShell)
```powershell
# The OTP prints to console in format shown above
# Just look at the terminal where npm start is running
```

---

## After Testing

### If All Tests Pass ✅
1. Take screenshot for documentation
2. Commit changes: 
   ```bash
   git add .
   git commit -m "Implement mobile OTP password reset"
   ```
3. Push to GitHub:
   ```bash
   git push origin main
   ```
4. Deploy to Render (auto-deploys on push)
5. Test on production URL

### If Issues Found ❌
1. Check troubleshooting section above
2. Review MOBILE_OTP_IMPLEMENTATION.md
3. Check backend console for error messages
4. Fix issues and re-test before committing

---

## Estimated Times
- Setup & Open Frontend: 30 seconds
- Request OTP: 5-10 seconds
- Find OTP in Backend: 10 seconds
- Enter & Verify OTP: 5 seconds
- Reset Password: 5 seconds
- Login with New Password: 5-10 seconds
- **Total Time**: ~3-5 minutes

---

## Reference Docs
- Full test guide: `MOBILE_OTP_TEST.md`
- Implementation details: `MOBILE_OTP_IMPLEMENTATION.md`
- Password testing: `PASSWORD_TESTING_GUIDE.md`

---

**Status**: Ready for Testing  
**Date**: February 25, 2026
