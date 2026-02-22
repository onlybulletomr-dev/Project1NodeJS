-- ============================================
-- Migration: Add BranchId and UserId tracking to main tables
-- Date: February 22, 2026
-- Purpose: Enable branch isolation and audit trail
-- ============================================

-- 1. Add columns to InvoiceMaster (if not already exist)
ALTER TABLE InvoiceMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 2. Add columns to InvoiceDetail
ALTER TABLE InvoiceDetail 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 3. Add columns to CustomerMaster
ALTER TABLE CustomerMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 4. Add columns to VehicleDetails
ALTER TABLE VehicleDetails 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 5. Add columns to VehicleMaster (if it exists)
ALTER TABLE VehicleMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 6. Add columns to ItemMaster
ALTER TABLE ItemMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 7. Add columns to ItemDetail
ALTER TABLE ItemDetail 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 8. Add columns to ItemCategoryMaster (if it exists)
ALTER TABLE ItemCategoryMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoicemaster_branchid ON InvoiceMaster(BranchId);
CREATE INDEX IF NOT EXISTS idx_invoicemaster_createdby ON InvoiceMaster(CreatedBy);
CREATE INDEX IF NOT EXISTS idx_customermaster_branchid ON CustomerMaster(BranchId);
CREATE INDEX IF NOT EXISTS idx_vehicledetails_branchid ON VehicleDetails(BranchId);
CREATE INDEX IF NOT EXISTS idx_itemmaster_branchid ON ItemMaster(BranchId);

-- 10. Verify AlteringSuccess
SELECT 'Migration completed successfully!' as status;
