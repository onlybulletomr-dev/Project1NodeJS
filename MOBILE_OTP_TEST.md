# Mobile OTP Password Reset - Testing Guide

## Test Date: February 25, 2026

### Implementation Summary
✅ Frontend: Phone-based OTP request form (ForgotPassword.js)
✅ Backend: Mobile OTP verification endpoints (authController.js)
✅ Styling: Mobile OTP display components (PasswordManagement.css)
✅ Phone Validation: Indian format + international support

---

## Test Environment

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000
- **Database**: PostgreSQL (EmployeeMaster table)

---

## Test Scenario 1: Request OTP with Phone Number

### Prerequisites
- ForgotPassword page accessible at http://localhost:3000/forgot-password
- Backend running with database connected
- Employee record exists with PhoneNumber in EmployeeMaster

### Steps
1. Navigate to http://localhost:3000/forgot-password
2. Leave "Employee ID" field blank (optional)
3. Enter phone number: `9876543210` (any 10-digit number starting with 6-9)
4. Click "Send OTP" button

### Expected Results
- ✓ Form accepts the phone number without error
- ✓ Button shows "Sending OTP..." while processing
- ✓ Success message displays: "OTP sent to your registered mobile number. Check your SMS."
- ✓ Form transitions to Step 2 (OTP verification)
- ✓ **Backend Console** shows:
  ```
  ========================================
  DEMO OTP for [Employee Name]
  Mobile: [Phone Number]
  OTP: [6-digit code]
  ========================================
  ```

### Demo OTP Location
- Check backend terminal/console window
- Look for the `========================================` separator
- Extract the 6-digit OTP from the console output

---

## Test Scenario 2: Verify OTP

### Prerequisites
- Completed Test Scenario 1
- Have the 6-digit OTP from backend console

### Steps
1. On Step 2 of ForgotPassword page:
   - See "Sent to: ****3210" (last 4 digits of phone, masked)
2. Enter the 6-digit OTP in the "Enter OTP" field
   - Example OTP: `123456`
3. Click "Verify OTP & Reset Password" button

### Expected Results
- ✓ OTP input accepts only numeric characters (auto-rejects letters)
- ✓ OTP input limits to 6 characters
- ✓ Masked phone display shows `****[last 4 digits]`
- ✓ Button shows "Verifying..." while processing
- ✓ Success message displays
- ✓ Page redirects to /reset-password after 1-2 seconds
- ✓ Reset Token stored in localStorage

### If OTP is Invalid
- ✓ Error message displays: "Invalid OTP. Please try again."
- ✓ User remains on Step 2
- ✓ Can click "Resend OTP" to get a new OTP

---

## Test Scenario 3: Resend OTP

### Prerequisites
- On Step 2 of ForgotPassword page
- Want to request a new OTP

### Steps
1. Click "Resend OTP" button on Step 2
2. Wait for processing

### Expected Results
- ✓ Button shows "Resending..." while processing
- ✓ Success message displays: "New OTP sent to your mobile number. Check your SMS."
- ✓ New OTP appears in backend console
- ✓ Can enter the new OTP to verify

---

## Test Scenario 4: Phone Number Validation

### Invalid Phone Numbers (Should Show Error)
1. **Too short**: `98765432`
   - Error: "Please enter a valid 10-digit phone number"

2. **Invalid prefix**: `1876543210` (starts with 1)
   - Error: "Please enter a valid 10-digit phone number"

3. **Empty field**: (Both phone and ID blank)
   - Error: "Please enter either phone number or Employee ID"

### Valid Phone Formats (Should Be Accepted)
1. **10-digit Indian**: `9876543210`
2. **With country code**: `+91 9876543210`
3. **With 91 prefix**: `91 9876543210`
4. **With spaces**: `9876 543210` (gets cleaned automatically)

### Phone Validation Regex
```javascript
/^(\+91|91)?[6-9]\d{9}$/
```

---

## Test Scenario 5: Employee ID Method (Alternative)

### Prerequisites
- Know an employee's ID in the database
- ForgotPassword page open

### Steps
1. Leave "Mobile Number" field blank
2. Enter Employee ID: `E001` (or valid employee ID)
3. Click "Send OTP"

### Expected Results
- ✓ System accepts Employee ID
- ✓ Backend queries EmployeeMaster by EmployeeID instead of PhoneNumber
- ✓ OTP is sent to the employee's phone (from PhoneNumber column)
- ✓ Verification process same as phone-based flow

---

## Test Scenario 6: Complete Password Reset Flow

### Prerequisites
- None (start fresh)

### Full Steps
1. **Request OTP**: Navigate → Enter phone → Send OTP
2. **Get Demo OTP**: Check backend console for OTP
3. **Verify OTP**: Enter OTP on Step 2 → Verify
4. **Reset Password**: 
   - New password: `Test@1234`
   - Confirm: `Test@1234`
   - Password strength indicator should show GREEN
   - Click "Reset Password"
5. **Login with New Password**:
   - Navigate to http://localhost:3000/login
   - Username: Same as before
   - Password: `Test@1234`
   - Should login successfully

### Expected Results
- ✓ All steps complete without errors
- ✓ Password reset confirmed with success message
- ✓ New password works at login
- ✓ Can use new password for all subsequent logins

---

## Test Scenario 7: Backend API Testing (PostMan/Curl)

### Request OTP via API
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "employeeId": null
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "OTP sent to registered mobile number",
  "demoOTP": "123456",
  "employeeId": "E001"
}
```

### Verify OTP via API
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "employeeId": null,
    "otp": "123456"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "resetToken": "base64-encoded-token",
  "userId": "E001"
}
```

---

## Test Scenario 8: Error Handling

### Test Invalid Employee Data
1. Enter phone number: `9999999999` (doesn't exist in DB)
2. Click "Send OTP"
3. Expected: Error message "No account found with provided details"

### Test Employee with NULL PhoneNumber
1. If employee has NULL in PhoneNumber column
2. Enter phone number but no match found
3. Expected: Error message "No account found with provided details"

### Test Network Error Simulation
1. Stop backend server
2. Try to send OTP
3. Expected: "Error connecting to server. Please try again."

---

## CSS/UI Testing

### Verify Mobile OTP Styling

1. **Phone Input Styling**:
   - ✓ Input field clear and readable
   - ✓ Placeholder text visible: "Enter 10-digit mobile number"
   - ✓ Form hint visible: "e.g., 9876543210 or +91 9876543210"

2. **OTP Display Box Styling**:
   - ✓ Light blue background (#e3f2fd)
   - ✓ Blue border (#90caf9)
   - ✓ Text centered
   - ✓ Shows masked phone: "Sent to: ****3210"
   - ✓ Text color blue (#1976d2)

3. **Form Hint Styling**:
   - ✓ Small gray text (11px)
   - ✓ Italic style
   - ✓ Appears below input fields

4. **Responsive Design**:
   - ✓ Test on mobile (iPhone, Android)
   - ✓ Test on tablet (iPad)
   - ✓ Test on desktop (1920x1080, 1366x768)
   - ✓ All elements readable and clickable

---

## Production Readiness Checklist

Before deploying to production:

- [ ] Database has PhoneNumber column populated for all employees
- [ ] Database has Password column (for storing hashed passwords)
- [ ] SMS service provider integrated (replace console.log with actual SMS)
- [ ] OTP expiry implemented (5-minute timeout)
- [ ] OTP storage implemented (Redis or cache)
- [ ] Rate limiting on OTP endpoints (max 5 attempts per hour)
- [ ] Password hashing implemented (bcrypt)
- [ ] Error messages sanitized (no system details)
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] API endpoints tested on staging
- [ ] Load testing completed
- [ ] Security audit completed

---

## SMS Integration Options (For Production)

### Twilio
```bash
npm install twilio
```

### AWS SNS
```bash
npm install aws-sdk
```

### Google Nexmo
```bash
npm install nexmo
```

### India-Specific Providers
- MSG91
- route.com  
- Sify SMS
- Infobip

---

## Current Status: MOBILE OTP IMPLEMENTATION

✅ **Completed**:
1. ForgotPassword component updated for mobile
2. Backend endpoints updated for phone-based OTP
3. Phone validation implemented
4. OTP display masking implemented
5. CSS styling added
6. Testing guide created
7. API documentation prepared

⏳ **Next Steps**:
1. Run local tests (all 8 scenarios)
2. Verify backend console shows demo OTPs
3. Commit changes to git
4. Push to GitHub
5. Deploy to Render.com
6. Test on production environment
7. Integrate SMS service
8. Final security audit

---

## Testing Reports

| Test Scenario | Status | Date | Notes |
|---|---|---|---|
| 1. Request OTP | ⏳ Pending | - | - |
| 2. Verify OTP | ⏳ Pending | - | - |
| 3. Resend OTP | ⏳ Pending | - | - |
| 4. Phone Validation | ⏳ Pending | - | - |
| 5. Employee ID Method | ⏳ Pending | - | - |
| 6. Complete Flow | ⏳ Pending | - | - |
| 7. API Testing | ⏳ Pending | - | - |
| 8. Error Handling | ⏳ Pending | - | - |

---

Generated: February 25, 2026
System: Only Bullet - ERP System
