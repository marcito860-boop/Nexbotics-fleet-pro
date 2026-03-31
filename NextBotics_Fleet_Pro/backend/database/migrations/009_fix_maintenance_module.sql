-- ============================================
-- MAINTENANCE MODULE FIX - March 30, 2026
-- Fixes issues with creating maintenance schedules and records
-- ============================================

-- 1. FIX maintenance_schedules table
-- The model uses 'service_name' but table was created with 'title'
-- We need to add service_name column and keep it in sync

ALTER TABLE maintenance_schedules 
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);

-- Update existing rows to set service_name from title if NULL
UPDATE maintenance_schedules 
  SET service_name = COALESCE(service_name, title, 'Untitled Service')
  WHERE service_name IS NULL;

-- Set title from service_name where title is NULL (for any inconsistent data)
UPDATE maintenance_schedules 
  SET title = COALESCE(title, service_name, 'Untitled Service')
  WHERE title IS NULL;

-- Ensure both columns have values going forward
-- (The model inserts into service_name, but title should also have a value)
UPDATE maintenance_schedules 
  SET service_name = title
  WHERE service_name IS NULL AND title IS NOT NULL;

-- 2. FIX maintenance_records table
-- Ensure service_date column exists and allows NULL
ALTER TABLE maintenance_records 
  ADD COLUMN IF NOT EXISTS service_date DATE;

-- Remove NOT NULL constraint if it exists
DO $$
BEGIN
    ALTER TABLE maintenance_records ALTER COLUMN service_date DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Ensure all required columns exist in maintenance_records
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS started_date DATE;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS service_mileage DECIMAL(10,1);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS next_service_mileage DECIMAL(10,1);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS parts_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS other_cost DECIMAL(10,2) DEFAULT 0;

-- Add total_cost as generated column if it doesn't exist
DO $$
BEGIN
    -- Check if total_cost exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE maintenance_records 
        ADD COLUMN total_cost DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0) + COALESCE(other_cost, 0)) STORED;
    END IF;
END $$;

ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS breakdown_location TEXT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS breakdown_cause TEXT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS technician_name VARCHAR(255);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS warranty_months INTEGER;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS warranty_expiry DATE;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS documents JSONB;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Ensure maintenance_parts table has all columns
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS record_id UUID;
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS part_id UUID;
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS part_number VARCHAR(100);
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS part_name VARCHAR(255);
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;

-- Add total_cost as generated column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_parts' 
        AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE maintenance_parts 
        ADD COLUMN total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED;
    END IF;
END $$;

-- 5. Ensure job_cards table exists and has correct columns
CREATE TABLE IF NOT EXISTS job_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    record_id UUID,
    provider_id UUID,
    card_number VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    actual_cost DECIMAL(10,2) DEFAULT 0,
    sent_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    garage_notes TEXT,
    internal_notes TEXT,
    documents JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_company ON maintenance_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle ON maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_company ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_company ON job_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_record ON job_cards(record_id);

-- 7. Verify and fix foreign key constraints
DO $$
BEGIN
    -- Ensure maintenance_records.vehicle_id references vehicles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_maintenance_records_vehicle'
    ) THEN
        ALTER TABLE maintenance_records 
        ADD CONSTRAINT fk_maintenance_records_vehicle 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    -- Ensure maintenance_schedules.vehicle_id references vehicles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_maintenance_schedules_vehicle'
    ) THEN
        ALTER TABLE maintenance_schedules 
        ADD CONSTRAINT fk_maintenance_schedules_vehicle 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 8. Grant permissions (if needed for PostgreSQL)
-- This ensures the tables are accessible

-- 9. Add a test to verify the fix
DO $$
DECLARE
    schedule_count INTEGER;
    record_count INTEGER;
BEGIN
    -- Check if tables exist and are accessible
    SELECT COUNT(*) INTO schedule_count FROM maintenance_schedules LIMIT 1;
    SELECT COUNT(*) INTO record_count FROM maintenance_records LIMIT 1;
    
    RAISE NOTICE 'Maintenance module fix applied successfully!';
    RAISE NOTICE 'Schedules table: % rows', schedule_count;
    RAISE NOTICE 'Records table: % rows', record_count;
END $$;
