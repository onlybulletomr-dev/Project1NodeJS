-- ============================================
-- Migration: Add BranchId and UserId tracking to branch-specific tables
-- Date: February 22, 2026
-- Purpose: Enable branch isolation and audit trail
-- ARCHITECTURE:
--   - VehicleMaster: SHARED across all branches (no BranchId)
--   - VehicleDetails: SHARED across all branches (no BranchId)
--   - ItemMaster: SHARED across all branches (no BranchId)
--   - ItemDetail: BRANCH-SPECIFIC (has BranchId)
--   - All other operational tables: Branch-specific with CreatedBy tracking
-- ============================================

-- 1. Add columns to InvoiceMaster (BRANCH-SPECIFIC)
ALTER TABLE InvoiceMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 2. Add columns to InvoiceDetail (BRANCH-SPECIFIC)
ALTER TABLE InvoiceDetail 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 3. Add columns to CustomerMaster (BRANCH-SPECIFIC)
ALTER TABLE CustomerMaster 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 4. IMPORTANT: Do NOT add BranchId to VehicleDetails - it's a SHARED MASTER
-- VehicleDetails are shared across all branches (similar to VehicleMaster)
-- Each branch uses the same vehicle instances and details
ALTER TABLE VehicleDetails 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 5. IMPORTANT: Do NOT add BranchId to VehicleMaster - it's a shared master
-- VehicleMaster is available to all branches (no branch isolation)
ALTER TABLE VehicleMaster 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 6. Add columns to ItemDetail (BRANCH-SPECIFIC)
-- NOTE: ItemDetail lines are branch-specific (stock levels per branch)
ALTER TABLE ItemDetail 
ADD COLUMN IF NOT EXISTS BranchId INTEGER REFERENCES CompanyMaster(CompanyId),
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 7. IMPORTANT: Do NOT add BranchId to ItemMaster - it's a shared master
-- ItemMaster is available to all branches (no branch isolation)
ALTER TABLE ItemMaster 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 8. Add columns to ItemCategoryMaster (SHARED MASTER - no BranchId)
ALTER TABLE ItemCategoryMaster 
ADD COLUMN IF NOT EXISTS CreatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId),
ADD COLUMN IF NOT EXISTS UpdatedBy INTEGER REFERENCES EmployeeMaster(EmployeeId);

-- 9. Create indexes for performance on branch-specific tables ONLY
CREATE INDEX IF NOT EXISTS idx_invoicemaster_branchid ON InvoiceMaster(BranchId);
CREATE INDEX IF NOT EXISTS idx_invoicemaster_createdby ON InvoiceMaster(CreatedBy);
CREATE INDEX IF NOT EXISTS idx_customermaster_branchid ON CustomerMaster(BranchId);
CREATE INDEX IF NOT EXISTS idx_itemdetail_branchid ON ItemDetail(BranchId);

-- 10. Create indexes on shared masters (no branch filter needed)
CREATE INDEX IF NOT EXISTS idx_vehicledetails_createdby ON VehicleDetails(CreatedBy);
CREATE INDEX IF NOT EXISTS idx_vehiclemaster_createdby ON VehicleMaster(CreatedBy);
CREATE INDEX IF NOT EXISTS idx_itemmaster_createdby ON ItemMaster(CreatedBy);

-- 11. Verify migration completed
SELECT 'Migration completed successfully!' as status;


