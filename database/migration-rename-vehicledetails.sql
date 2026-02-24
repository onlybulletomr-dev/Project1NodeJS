-- ============================================
-- Migration: Rename vehicledetails to vehicledetail
-- Date: February 25, 2026
-- Purpose: Align Render database with local development database naming
-- ============================================

-- Step 1: Drop the foreign key constraint from invoicemaster
ALTER TABLE invoicemaster
DROP CONSTRAINT IF EXISTS invoicemaster_vehicleid_fkey;

-- Step 2: Rename the table from vehicledetails to vehicledetail
ALTER TABLE vehicledetails
RENAME TO vehicledetail;

-- Step 3: Re-create the foreign key constraint with the new table name
ALTER TABLE invoicemaster
ADD CONSTRAINT invoicemaster_vehicleid_fkey
FOREIGN KEY (vehicleid) REFERENCES vehicledetail(vehicleid);

-- Step 4: Verify the rename was successful
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('vehicledetail', 'vehicledetails') 
AND table_schema = 'public';
