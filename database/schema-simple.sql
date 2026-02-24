-- Simplified schema for essential tables

-- CustomerMaster table
CREATE TABLE IF NOT EXISTS customermaster (
    customerid SERIAL PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100),
    mobilenumber1 VARCHAR(20),
    mobilenumber2 VARCHAR(20),
    emailaddress VARCHAR(100),
    addressline1 VARCHAR(150),
    addressline2 VARCHAR(150),
    city VARCHAR(100),
    state VARCHAR(100),
    postalcode VARCHAR(20),
    country VARCHAR(100),
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP,
    deletedat TIMESTAMP
);

-- VehicleDetail table (singular)
CREATE TABLE IF NOT EXISTS vehicledetail (
    vehicleid SERIAL PRIMARY KEY,
    registrationnumber VARCHAR(50) UNIQUE,
    vehicletype VARCHAR(50),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    yearofmanufacture INTEGER,
    enginenumber VARCHAR(50),
    chassisnumber VARCHAR(50),
    color VARCHAR(50),
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP,
    deletedat TIMESTAMP
);

-- InvoiceMaster table
CREATE TABLE IF NOT EXISTS invoicemaster (
    invoiceid SERIAL PRIMARY KEY,
    invoicenumber VARCHAR(50) UNIQUE NOT NULL,
    customerId INTEGER REFERENCES customermaster(customerid),
    vehicleId INTEGER REFERENCES vehicledetail(vehicleid),
    vehiclenumber VARCHAR(50),
    invoicedate DATE,
    totalamount DECIMAL(10, 2),
    paymentstatus VARCHAR(50) DEFAULT 'Unpaid',
    notes TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP,
    deletedat TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoicemaster(paymentstatus);
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoicemaster(customerid);
CREATE INDEX IF NOT EXISTS idx_invoice_vehicle ON invoicemaster(vehicleid);
