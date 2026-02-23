-- Add unique constraint on customerid + vehiclenumber in vehicledetail table
ALTER TABLE vehicledetail ADD CONSTRAINT uk_vehicledetail_customerid_vehiclenumber 
UNIQUE (customerid, vehiclenumber);
