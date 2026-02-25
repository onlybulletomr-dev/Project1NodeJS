# Password Management System - Testing Guide

## Local Testing

### Backend: http://localhost:5000
### Frontend: http://localhost:3000

---

## Test Scenarios

### 1. **Login Flow**
- **URL:** http://localhost:3000/login
- **Demo Credentials:**
  - Username: `Murali` (or `Jagatheish`)
  - Password: Any value (demo accepts any password)
- **Expected:** Redirects to Customer Master dashboard

### 2. **Forgot Password Flow (Mobile OTP)**
- **URL:** http://localhost:3000/forgot-password
- **Steps:**
  1. Enter mobile number (10 digits) OR Employee ID
  2. Click "Send OTP"
  3. In backend console, find the demo OTP (Check browser console or terminal)
  4. Enter the 6-digit OTP
  5. Click "Verify OTP & Reset Password"
  6. System generates reset token and redirects to reset password screen
- **Demo Mobile:** Any 10-digit number starting with 6-9
  - Example: 9876543210

### 3. **Reset Password Flow**
- **URL:** http://localhost:3000/reset-password (auto-redirected after OTP verification)
- **Steps:**
  1. Enter new password (must meet requirements)
  2. Confirm password
  3. See password strength indicator
  4. Click "Reset Password"
  5. Redirected to login screen after 2 seconds

### 4. **Set Password Flow (New Employee Setup)**
- **URL:** http://localhost:3000/set-password?token=<setup-token>
- **Note:** Only accessible via direct link with valid setup token
- **Steps:**
  1. Employee info auto-loads from token
  2. Set password with requirements
  3. Confirm password
  4. Click "Set Password & Login"
  5. Redirected to login screen

---

## Password Requirements

All password screens enforce:
- ✓ Minimum 8 characters
- ✓ At least one uppercase letter (A-Z)
- ✓ At least one lowercase letter (a-z)
- ✓ At least one number (0-9)

---

## Mobile Number Validation

The system accepts:
- 10-digit Indian mobile numbers: `9876543210`
- With country code: `+91 9876543210` or `91 9876543210`
- Starting digits: 6, 7, 8, or 9 (valid Indian mobile prefixes)

---

## Key Features

✅ **Mobile-Based OTP**: SMS OTP sent to registered mobile number
✅ **Employee ID Lookup**: Alternate method using Employee ID
✅ **OTP Verification**: Demo OTP shown in console for testing
✅ **Reset Password**: Secure token-based reset
✅ **Set Password**: New employee onboarding
✅ **Password Strength**: Real-time indicator
✅ **Responsive Design**: Works on mobile and desktop
✅ **Link-Only Access**: Password screens not accessible from navigation
✅ **Token Validation**: All screens validate tokens before allowing action
✅ **Resend OTP**: Allow user to resend OTP if not received

---

## Backend API Endpoints

All endpoints are accessible at `http://localhost:5000/api/auth/`

### Public (No Auth Required)
- `POST /login` - User login
- `POST /forgot-password` - Request password reset (via mobile OTP)
- `POST /verify-otp` - Verify OTP and get reset token
- `POST /reset-password` - Reset password with token
- `POST /set-password` - Set password for new employees
- `GET /employee-info` - Get employee info from setup token

### Protected (Requires x-user-id header)
- `GET /validate` - Validate session
- `GET /current-user` - Get current user info

---

## Demo OTP Location

When testing forgot password:
1. Open backend console/terminal where server is running
2. Look for message with format:
   ```
   ========================================
   DEMO OTP for [Employee Name]
   Mobile: [Phone Number]
   OTP: 123456
   ========================================
   ```
3. Use that 6-digit OTP to proceed with password reset

---

## Browser Testing URLs

- **Login:** http://localhost:3000/login
- **Forgot Password:** http://localhost:3000/forgot-password
- **Reset Password:** http://localhost:3000/reset-password
- **Set Password:** http://localhost:3000/set-password?token=base64encodedtoken

---

## Next Steps for Production

1. Add PhoneNumber verification to database schema (if not exists)
2. Integrate with SMS service provider:
   - Twilio
   - AWS SNS
   - India SMS APIs (MSG91, route.com, etc.)
3. Implement OTP storage with Redis or cache (5-minute expiry)
4. Implement bcrypt for password hashing
5. Add rate limiting for OTP requests
6. Add audit logging for password changes
7. Implement password expiry policies
8. Add security questions as backup recovery method
9. Add two-factor authentication (optional)
10. Test on staging environment before production

---

## Production SMS Integration Example (Twilio)

```javascript
const twilio = require('twilio');
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function sendOTP(phoneNumber, otp) {
  await client.messages.create({
    body: `Your Only Bullet ERP password reset OTP is: ${otp}. Valid for 5 minutes.`,
    from: TWILIO_PHONE,
    to: phoneNumber,
  });
}
```

---

## Production SMS Integration Example (AWS SNS)

```javascript
const AWS = require('aws-sdk');
const sns = new AWS.SNS();

async function sendOTP(phoneNumber, otp) {
  await sns.publish({
    Message: `Your Only Bullet ERP password reset OTP is: ${otp}. Valid for 5 minutes.`,
    PhoneNumber: phoneNumber,
  }).promise();
}
```

---

Generated: February 25, 2026

