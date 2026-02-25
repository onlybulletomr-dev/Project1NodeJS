-- Script to compare local vs Render database

-- Check customers
SELECT 'CUSTOMERS' as table_name, COUNT(*) as count FROM customermaster WHERE deletedat IS NULL;

-- Check vehicles  
SELECT 'VEHICLES' as table_name, COUNT(*) as count FROM vehicledetail WHERE deletedat IS NULL;

-- Check invoices
SELECT 'INVOICES' as table_name, COUNT(*) as count FROM invoicemaster WHERE deletedat IS NULL;

-- Sample customers
SELECT 'Customer Sample:' as info;
SELECT firstname, lastname, mobilenumber1 FROM customermaster WHERE deletedat IS NULL LIMIT 5;

-- Sample vehicles
SELECT 'Vehicle Sample:' as info;
SELECT registrationnumber, model, manufacturer FROM vehicledetail WHERE deletedat IS NULL LIMIT 5;
