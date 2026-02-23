-- Migration: Add Payment Management columns to InvoiceMaster table

-- Check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add InvoiceNumber column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoicemaster' AND column_name='invoicenumber'
    ) THEN
        ALTER TABLE InvoiceMaster ADD COLUMN InvoiceNumber VARCHAR(50) UNIQUE;
    END IF;

    -- Add TotalAmount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoicemaster' AND column_name='totalamount'
    ) THEN
        ALTER TABLE InvoiceMaster ADD COLUMN TotalAmount DECIMAL(10, 2);
    END IF;

    -- Add PaymentStatus column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoicemaster' AND column_name='paymentstatus'
    ) THEN
        ALTER TABLE InvoiceMaster ADD COLUMN PaymentStatus VARCHAR(20) DEFAULT 'Unpaid' NOT NULL;
    END IF;

    -- Add PaymentDate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoicemaster' AND column_name='paymentdate'
    ) THEN
        ALTER TABLE InvoiceMaster ADD COLUMN PaymentDate DATE NULL;
    END IF;

    -- Add VehicleNumber column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoicemaster' AND column_name='vehiclenumber'
    ) THEN
        ALTER TABLE InvoiceMaster ADD COLUMN VehicleNumber VARCHAR(50);
    END IF;

END $$;
