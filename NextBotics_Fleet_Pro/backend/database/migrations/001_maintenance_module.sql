-- ============================================
-- MAINTENANCE MODULE TABLES
-- ============================================

-- Service Providers (Garages/Workshops)
CREATE TABLE IF NOT EXISTS service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'general', -- general, specialist, dealership, emergency
    contact_person VARCHAR(255),
    phone VARCHAR(100),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'China',
    tax_id VARCHAR(100),
    bank_account VARCHAR(255),
    is_approved BOOLEAN DEFAULT false,
    rating DECIMAL(2,1) DEFAULT 0, -- 0-5 rating
    review_count INTEGER DEFAULT 0,
    specialties TEXT[], -- e.g., ['engine', 'transmission', 'electrical']
    working_hours JSONB, -- { "monday": {"open": "08:00", "close": "18:00"}, ... }
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spare Parts Inventory
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- engine, transmission, electrical, body, etc.
    manufacturer VARCHAR(255),
    compatible_vehicles TEXT[], -- Array of vehicle make/model patterns
    unit_cost DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    quantity_in_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    unit_of_measure VARCHAR(50) DEFAULT 'piece', -- piece, set, liter, kg, etc.
    location_code VARCHAR(100), -- warehouse location
    supplier_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
    lead_time_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, part_number)
);

-- Maintenance Schedules (Preventive Maintenance)
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    schedule_type VARCHAR(50) NOT NULL, -- mileage_based, time_based, or both
    service_type VARCHAR(100) NOT NULL, -- oil_change, tire_rotation, brake_inspection, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Mileage-based triggers
    interval_mileage INTEGER, -- e.g., 5000 km
    last_service_mileage DECIMAL(10,1) DEFAULT 0,
    next_service_mileage DECIMAL(10,1),
    
    -- Time-based triggers
    interval_months INTEGER, -- e.g., 3 months
    last_service_date DATE,
    next_service_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
    
    -- Estimated costs
    estimated_cost DECIMAL(10,2),
    estimated_duration_hours DECIMAL(4,1),
    
    -- Assignment
    assigned_provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
    
    -- Reminder settings
    reminder_days_before INTEGER DEFAULT 7,
    reminder_mileage_before INTEGER DEFAULT 500,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Records (History)
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    
    -- Service Details
    service_type VARCHAR(100) NOT NULL, -- preventive, repair, breakdown, emergency
    category VARCHAR(100) NOT NULL, -- engine, transmission, electrical, body, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Provider
    provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
    provider_name VARCHAR(255), -- backup if provider deleted
    
    -- Service Dates
    scheduled_date DATE,
    started_date DATE,
    completed_date DATE,
    
    -- Mileage
    service_mileage DECIMAL(10,1),
    next_service_mileage DECIMAL(10,1),
    
    -- Costs
    labor_cost DECIMAL(10,2) DEFAULT 0,
    parts_cost DECIMAL(10,2) DEFAULT 0,
    other_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (labor_cost + parts_cost + other_cost) STORED,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    
    -- Breakdown specific
    breakdown_location TEXT,
    breakdown_cause TEXT,
    is_emergency BOOLEAN DEFAULT false,
    
    -- Technician/Driver
    technician_name VARCHAR(255),
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Warranty
    warranty_months INTEGER,
    warranty_expiry DATE,
    
    -- Documents
    invoice_number VARCHAR(100),
    documents JSONB, -- Array of document URLs
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Record Parts (Parts used in service)
CREATE TABLE IF NOT EXISTS maintenance_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES maintenance_records(id) ON DELETE CASCADE,
    part_id UUID REFERENCES spare_parts(id) ON DELETE SET NULL,
    part_number VARCHAR(100) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Downtime Log
CREATE TABLE IF NOT EXISTS vehicle_downtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    
    downtime_type VARCHAR(50) NOT NULL, -- maintenance, repair, accident, other
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    
    -- Calculated field for duration
    duration_hours DECIMAL(6,1),
    duration_days INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN end_date IS NOT NULL THEN (end_date - start_date)
            ELSE NULL
        END
    ) STORED,
    
    reason TEXT,
    impact VARCHAR(50), -- low, medium, high, critical
    replacement_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Reminders/Alerts
CREATE TABLE IF NOT EXISTS maintenance_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    reminder_type VARCHAR(50) NOT NULL, -- mileage_due, time_due, both
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Due thresholds
    due_mileage DECIMAL(10,1),
    due_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, acknowledged, dismissed
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    
    -- Notification
    notified_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Provider Reviews
CREATE TABLE IF NOT EXISTS service_provider_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    reviewed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
    
    comment TEXT,
    would_recommend BOOLEAN,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle ON maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_date ON maintenance_schedules(next_service_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_dates ON maintenance_records(completed_date, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_downtime_vehicle ON vehicle_downtime(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_downtime_dates ON vehicle_downtime(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category);
CREATE INDEX IF NOT EXISTS idx_spare_parts_stock ON spare_parts(quantity_in_stock, reorder_level);
CREATE INDEX IF NOT EXISTS idx_service_providers_type ON service_providers(type);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_status ON maintenance_reminders(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_due ON maintenance_reminders(due_date);
