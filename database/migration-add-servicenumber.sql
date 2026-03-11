-- Migration: Add servicenumber column to ServiceMaster table
-- Run this in Render's SQL editor or psql

-- Add servicenumber column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='servicemaster' AND column_name='servicenumber'
    ) THEN
        ALTER TABLE servicemaster ADD COLUMN servicenumber VARCHAR(100) NOT NULL;
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name='servicemaster' 
ORDER BY ordinal_position;
