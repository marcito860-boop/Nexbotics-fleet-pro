-- Fix: Add missing warranty_expiry column to maintenance_records
-- This column was added to the CREATE TABLE but existing tables need ALTER TABLE

DO $$
BEGIN
    -- Add warranty_expiry column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'warranty_expiry'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN warranty_expiry DATE;
    END IF;
END $$;

-- Also ensure other recently added columns exist
DO $$
BEGIN
    -- Add title column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN title VARCHAR(255);
    END IF;

    -- Add category column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN category VARCHAR(100);
    END IF;

    -- Add started_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'started_date'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN started_date DATE;
    END IF;

    -- Add provider_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL;
    END IF;

    -- Add provider_name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'provider_name'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN provider_name VARCHAR(255);
    END IF;

    -- Add next_service_mileage column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'next_service_mileage'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN next_service_mileage DECIMAL(10,1);
    END IF;

    -- Add labor_cost column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'labor_cost'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN labor_cost DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add parts_cost column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'parts_cost'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN parts_cost DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add other_cost column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'other_cost'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN other_cost DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add total_cost column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN total_cost DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0) + COALESCE(other_cost, 0)) STORED;
    END IF;

    -- Add breakdown_location column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'breakdown_location'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN breakdown_location TEXT;
    END IF;

    -- Add breakdown_cause column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'breakdown_cause'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN breakdown_cause TEXT;
    END IF;

    -- Add is_emergency column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'is_emergency'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN is_emergency BOOLEAN DEFAULT false;
    END IF;

    -- Add technician_name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'technician_name'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN technician_name VARCHAR(255);
    END IF;

    -- Add warranty_months column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'warranty_months'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN warranty_months INTEGER;
    END IF;

    -- Add invoice_number column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'invoice_number'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN invoice_number VARCHAR(100);
    END IF;

    -- Add documents column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'documents'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN documents JSONB;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_records_warranty_expiry ON maintenance_records(warranty_expiry);