# Print Template Configuration Guide

## Summary of Changes Made

✅ **1. Border Added to A4 Page**
- Added `border: 2px solid #000;` to the `.page` CSS class
- The complete invoice page now has a black border around it

✅ **2. Branch Address in Header**
- Header now displays branch address from the `companymaster` table
- Shows: Address Line 1, Address Line 2, City, State, Postal Code
- Dynamically fetched from the database configuration

✅ **3. Bank Details in Footer**
- Footer now displays bank information from the `companymaster` table
- Shows: Bank Name, Account Number, IFSC Code
- Displayed prominently next to the QR code

## How to Update Configuration

### Option 1: Using the Database Directly

Update the `companymaster` table with your branch and bank details:

```sql
UPDATE companymaster 
SET 
  addressline1 = 'Your Address Line 1',
  addressline2 = 'Your Address Line 2',
  city = 'Your City',
  state = 'Your State',
  postalcode = 'Your Postal Code',
  bankname = 'Your Bank Name',
  bankaccountnumber = 'Your Account Number',
  bankswiftcode = 'Your IFSC Code',
  phonenumber1 = 'Your Phone Number',
  emailaddress = 'Your Email'
WHERE companyid = 1;
```

### Option 2: Using the Company Management Screen
If you have a company management UI:
1. Edit the company/branch details
2. Fill in all address fields
3. Fill in bank details fields
4. Save

## API Endpoint

The backend now provides a new endpoint to fetch company configuration:

**Endpoint:** `GET /api/companies/{branchId}/config`

**Response:**
```json
{
  "success": true,
  "data": {
    "companyid": 1,
    "companyname": "Only Bullet",
    "addressline1": "Near HP Petrol Bunk",
    "addressline2": "Saidapet",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "postalcode": "600015",
    "country": "India",
    "phonenumber1": "9962285538",
    "emailaddress": "info@onlybullet.com",
    "bankname": "Indian Bank",
    "bankaccountnumber": "344002000285538",
    "bankswiftcode": "IOBA0003400"
  }
}
```

## Files Modified

### Backend
- **backend/routes/companyRoutes.js** - Added new route for company config
- **backend/controllers/companyController.js** - Added getCompanyConfig function
- **backend/models/CompanyMaster.js** - No changes needed

### Frontend
- **frontend/src/utils/printUtils.js** - Updated template to display branch address and bank details
- **frontend/src/components/InvoiceList.js** - Updated handlePrintInvoice to fetch config
- **frontend/src/components/InvoiceForm.js** - Updated getInvoiceDocumentData to fetch config
- **frontend/package.json** - Added startup optimization

## Current Configuration

The system is currently configured with:
```
Address: Near HP Petrol Bunk, Saidapet, Chennai, Tamil Nadu 600015
Bank: Indian Bank
Account: 344002000285538
IFSC: IOBA0003400
Phone: 9962285538
```

To change these values, update them in the `companymaster` table using the SQL command above.

## Print Template Features

✅ Border around complete A4 page
✅ Branch address in header (from database)
✅ Company name and contact info in header
✅ Logo displayed in center
✅ Vehicle details in top right
✅ Service due information
✅ Item details table (50% of page)
✅ QR code for payment
✅ Bank details below QR code (from database)
✅ Totals breakdown (Total, Discount, Advance Paid, Balance Due)
✅ ODO reading and observations in footer

## Next Steps (Optional)

1. **Add Logo Support** - Upload company logo to the database and display in header
2. **Multi-Branch Support** - Customize address/bank details per branch by setting different companyid
3. **Custom Footer Text** - Add a footer message field to the configuration
4. **Color Customization** - Add theme colors to the configuration table
