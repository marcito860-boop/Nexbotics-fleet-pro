-- Fix: Remove NOT NULL constraint from service_date if it exists
-- Also add any other missing columns

DO $$
BEGIN
    -- Check if service_date column exists and modify it to allow NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'service_date'
    ) THEN
        -- Drop the NOT NULL constraint if it exists
        ALTER TABLE maintenance_records ALTER COLUMN service_date DROP NOT NULL;
    END IF;
END $$;

-- Also ensure service_date exists (it might not be in the INSERT but let's make sure)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'service_date'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN service_date DATE;
    END IF;
END $$;