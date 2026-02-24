-- Project1db Database Schema Setup
-- Owner: postgres
-- Password: admin

-- CREATE TABLE CompanyMaster
CREATE TABLE CompanyMaster (
    CompanyID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    CompanyName VARCHAR(255) NOT NULL,

    ParentCompanyID INTEGER NULL,

    LegalStructure VARCHAR(50) NULL,
    RegistrationNumber VARCHAR(100) NULL,
    TaxID VARCHAR(50) NULL,

    AddressLine1 VARCHAR(150) NOT NULL,
    AddressLine2 VARCHAR(150) NULL,
    City VARCHAR(100) NULL,
    State VARCHAR(100) NULL,
    PostalCode VARCHAR(20) NULL,
    Country VARCHAR(100) NOT NULL,

    ContactPerson VARCHAR(100) NULL,
    EmailAddress VARCHAR(100) UNIQUE,
    PhoneNumber1 VARCHAR(20) NOT NULL,
    PhoneNumber2 VARCHAR(20) NULL,
    WebsiteUrl VARCHAR(255) NULL,
    LogoImagePath VARCHAR(255) NULL,

    BankName VARCHAR(100) NULL,
    BankAccountNumber VARCHAR(50) NULL,
    BankSwiftCode VARCHAR(50) NULL,

    ExtraVar1 VARCHAR(100) NULL,
    ExtraVar2 VARCHAR(100) NULL,
    ExtraInt1 INTEGER NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    CONSTRAINT fk_parent_company
        FOREIGN KEY (ParentCompanyID)
        REFERENCES CompanyMaster (CompanyID)
        ON DELETE SET NULL
);

-- CREATE TABLE CustomerMaster
CREATE TABLE CustomerMaster (
    CustomerID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,

    EmailAddress VARCHAR(100) UNIQUE NULL,
    GSTNumber VARCHAR(50) NULL,

    LoyalityPoints DECIMAL(10, 2) NULL,

    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    MarketingConsent BOOLEAN NOT NULL DEFAULT FALSE,

    Profession VARCHAR(50) NULL,
    Gender VARCHAR(20) NULL,
    DateOfBirth DATE NULL,
    DateOfMarriage DATE NULL,

    AddressLine1 VARCHAR(150) NULL,
    AddressLine2 VARCHAR(150) NULL,
    City VARCHAR(100) NULL,
    State VARCHAR(100) NULL,
    PostalCode VARCHAR(20) NULL,

    MobileNumber1 VARCHAR(20) UNIQUE,
    MobileNumber2 VARCHAR(20) UNIQUE,

    ExtraVar1 VARCHAR(100) NULL,
    ExtraVar2 VARCHAR(100) NULL,
    ExtraInt1 INTEGER NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    BranchID INTEGER NOT NULL,

    CONSTRAINT fk_customer_branch
        FOREIGN KEY (BranchID)
        REFERENCES CompanyMaster (CompanyID)
        ON DELETE RESTRICT
);

-- CREATE TABLE VehicleDetail
CREATE TABLE VehicleDetail (
    VehicleDetailID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    CustomerID INTEGER NOT NULL,

    VehicleNumber VARCHAR(50) NOT NULL,
    VehicleModel VARCHAR(255) NOT NULL,
    VehicleColor VARCHAR(50) NOT NULL,

    ExtraVar1 VARCHAR(100) NULL,
    ExtraVar2 VARCHAR(100) NULL,
    ExtraInt1 INTEGER NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    CONSTRAINT fk_vehicledetail_customer
        FOREIGN KEY (CustomerID)
        REFERENCES CustomerMaster (CustomerID)
        ON DELETE CASCADE
);

-- CREATE TABLE VehicleManufacturer
CREATE TABLE VehicleManufacturer (
    ManufacturerID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    ManufacturerName VARCHAR(255) NOT NULL,
    ModelName VARCHAR(255) NOT NULL,

    ExtraVar1 VARCHAR(100) NULL,
    ExtraVar2 VARCHAR(100) NULL,
    ExtraInt1 INTEGER NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL
);

-- CREATE TABLE Vehicle
CREATE TABLE Vehicle (
    VehicleID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    CustomerID INTEGER NOT NULL,
    ManufacturerID INTEGER NOT NULL,

    RegistrationNumber VARCHAR(50) NOT NULL UNIQUE,
    Color VARCHAR(50) NOT NULL,
    ChassisNumber VARCHAR(100) NULL,
    EngineNumber VARCHAR(100) NULL,
    ManufacturingYear INTEGER NULL,
    PurchaseDate DATE NULL,

    ExtraVar1 VARCHAR(100) NULL,
    ExtraVar2 VARCHAR(100) NULL,
    ExtraInt1 INTEGER NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    CONSTRAINT fk_vehicle_customer
        FOREIGN KEY (CustomerID)
        REFERENCES CustomerMaster (CustomerID)
        ON DELETE CASCADE,

    CONSTRAINT fk_vehicle_manufacturer
        FOREIGN KEY (ManufacturerID)
        REFERENCES VehicleManufacturer (ManufacturerID)
        ON DELETE RESTRICT
);
-- CREATE TABLE InvoiceMaster
CREATE TABLE InvoiceMaster (
    InvoiceID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    InvoiceNumber VARCHAR(50) UNIQUE NOT NULL,
    VehicleNumber VARCHAR(50) NOT NULL,
    VehicleModel VARCHAR(255) NOT NULL,
    VehicleColor VARCHAR(50) NOT NULL,
    CustomerID INTEGER NOT NULL,
    MobileNumber1 VARCHAR(20) NULL,

    JobCardID VARCHAR(100) NULL,

    Notes TEXT NULL,

    TechnicianMain INTEGER NULL,
    TechnicianAssistant INTEGER NULL,
    ServiceAdvisorIn INTEGER NULL,
    ServiceAdvisorDeliver INTEGER NULL,
    TestDriver INTEGER NULL,
    Cleaner INTEGER NULL,
    WaterWash INTEGER NULL,

    Odometer VARCHAR(50) NULL,

    TotalDiscount DECIMAL(10, 2) NULL DEFAULT 0,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    PaymentStatus VARCHAR(20) DEFAULT 'Unpaid' NOT NULL,
    PaymentDate DATE NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    CONSTRAINT fk_invoice_customer
        FOREIGN KEY (CustomerID)
        REFERENCES CustomerMaster (CustomerID)
        ON DELETE CASCADE,

    CONSTRAINT fk_invoice_technician_main
        FOREIGN KEY (TechnicianMain)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_technician_assistant
        FOREIGN KEY (TechnicianAssistant)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_service_advisor_in
        FOREIGN KEY (ServiceAdvisorIn)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_service_advisor_deliver
        FOREIGN KEY (ServiceAdvisorDeliver)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_test_driver
        FOREIGN KEY (TestDriver)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_cleaner
        FOREIGN KEY (Cleaner)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_water_wash
        FOREIGN KEY (WaterWash)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE SET NULL
);

-- CREATE TABLE InvoiceDetail
CREATE TABLE InvoiceDetail (
    InvoiceDetailID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    InvoiceID INTEGER NOT NULL,

    ItemID VARCHAR(50) NOT NULL,
    Qty INTEGER NOT NULL,
    UnitPrice DECIMAL(10, 2) NOT NULL,
    LineDiscount DECIMAL(10, 2) NULL DEFAULT 0,
    Total DECIMAL(10, 2) NOT NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    CONSTRAINT fk_invoice_detail_invoice
        FOREIGN KEY (InvoiceID)
        REFERENCES InvoiceMaster (InvoiceID)
        ON DELETE CASCADE
);

-- CREATE TABLE PaymentDetail
CREATE TABLE PaymentDetail (
    PaymentReceivedID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    InvoiceID INTEGER NULL,
    VehicleID INTEGER NULL,
    PaymentMethodID INTEGER NOT NULL,

    ProcessedByUserID INTEGER NOT NULL,
    BranchID INTEGER NOT NULL,

    PaymentDate DATE NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,

    TransactionReference VARCHAR(100) NULL,
    PaymentStatus VARCHAR(20) DEFAULT 'Completed' NOT NULL,
    Notes TEXT NULL,

    ExtraVar1 VARCHAR(100) NULL,
    ExtraVar2 VARCHAR(100) NULL,
    ExtraInt1 INTEGER NULL,

    CreatedBy INTEGER NOT NULL,
    CreatedAt DATE NOT NULL,

    UpdatedBy INTEGER NULL,
    UpdatedAt DATE NULL,

    DeletedBy INTEGER NULL,
    DeletedAt DATE NULL,

    CONSTRAINT fk_payment_detail_invoice
        FOREIGN KEY (InvoiceID)
        REFERENCES InvoiceMaster (InvoiceID)
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_detail_vehicle
        FOREIGN KEY (VehicleID)
        REFERENCES VehicleDetail (VehicleDetailID)
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_detail_method
        FOREIGN KEY (PaymentMethodID)
        REFERENCES PaymentMethodMaster (PaymentMethodID)
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_detail_user
        FOREIGN KEY (ProcessedByUserID)
        REFERENCES EmployeeMaster (EmployeeID)
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_detail_branch
        FOREIGN KEY (BranchID)
        REFERENCES CompanyMaster (CompanyID)
        ON DELETE RESTRICT
);