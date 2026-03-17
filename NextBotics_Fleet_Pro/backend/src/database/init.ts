import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const initSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (multi-tenant isolation)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(50) DEFAULT 'active',
    max_users INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table with company isolation
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)
);

-- Super admins (cross-company access)
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    super_admin_id UUID REFERENCES super_admins(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (user_id IS NOT NULL AND super_admin_id IS NULL) OR
        (user_id IS NULL AND super_admin_id IS NOT NULL)
    )
);

-- Login audit log
CREATE TABLE IF NOT EXISTS login_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    login_status VARCHAR(50) NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_email ON users(company_id, email);
CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_company ON login_audit(company_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default super admin (password: SuperAdmin123!)
-- This is for initial setup only - should be changed immediately
-- Hash generated with bcrypt for 'SuperAdmin123!'
INSERT INTO super_admins (email, password_hash, first_name, last_name)
VALUES (
    'superadmin@nextbotics.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Super',
    'Admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FLEET MANAGEMENT MODULE
-- ============================================

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50),
    vin VARCHAR(50),
    engine_number VARCHAR(50),
    chassis_number VARCHAR(50),
    fuel_type VARCHAR(50) CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')),
    fuel_capacity DECIMAL(10,2),
    current_mileage DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    category VARCHAR(50),
    gps_device_id VARCHAR(100),
    gps_provider VARCHAR(50),
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    insurance_expiry DATE,
    license_expiry DATE,
    last_service_date DATE,
    next_service_due DATE,
    service_interval_km DECIMAL(10,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, registration_number)
);

-- Drivers table (extends users)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    license_number VARCHAR(100),
    license_expiry DATE,
    license_class VARCHAR(20),
    date_of_birth DATE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    address TEXT,
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
    safety_score INTEGER DEFAULT 100,
    total_trips INTEGER DEFAULT 0,
    total_distance DECIMAL(12,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.00,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle assignments (links vehicles to drivers)
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP WITH TIME ZONE,
    start_date DATE NOT NULL,
    end_date DATE,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fleet alerts/notifications
CREATE TABLE IF NOT EXISTS fleet_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('maintenance_due', 'insurance_expiry', 'license_expiry', 'speeding', 'geofence', 'fuel_low', 'diagnostic', 'assignment', 'custom')),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID REFERENCES users(id),
    dismissed_at TIMESTAMP WITH TIME ZONE,
    dismissed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GPS/Telematics data (raw data from devices)
CREATE TABLE IF NOT EXISTS gps_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    altitude DECIMAL(10, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    accuracy DECIMAL(6, 2),
    ignition BOOLEAN,
    odometer DECIMAL(12, 2),
    fuel_level DECIMAL(5, 2),
    engine_temp DECIMAL(5, 2),
    battery_voltage DECIMAL(5, 2),
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Geofence zones
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'circle' CHECK (type IN ('circle', 'polygon')),
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius_meters INTEGER,
    polygon_points JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    service_date DATE NOT NULL,
    mileage_at_service DECIMAL(12, 2),
    cost DECIMAL(10, 2),
    vendor VARCHAR(255),
    invoice_number VARCHAR(100),
    parts_replaced TEXT,
    notes TEXT,
    next_service_date DATE,
    next_service_mileage DECIMAL(12, 2),
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GPS integration configuration (placeholder for external providers)
CREATE TABLE IF NOT EXISTS gps_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('geotab', 'samsara', 'verizon_connect', 'fleetio', 'custom')),
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    webhook_secret TEXT,
    is_active BOOLEAN DEFAULT false,
    sync_interval_minutes INTEGER DEFAULT 5,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fleet tables
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(company_id, registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_gps_device ON vehicles(gps_device_id);

CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(company_id, status);

CREATE INDEX IF NOT EXISTS idx_assignments_company_id ON vehicle_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver ON vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON vehicle_assignments(status);

CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON fleet_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON fleet_alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_driver ON fleet_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON fleet_alerts(company_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_gps_telemetry_company_id ON gps_telemetry(company_id);
CREATE INDEX IF NOT EXISTS idx_gps_telemetry_vehicle ON gps_telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_telemetry_timestamp ON gps_telemetry(vehicle_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_geofences_company_id ON geofences(company_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);

-- Triggers for updated_at on fleet tables
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON vehicle_assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON vehicle_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofences_updated_at ON geofences;
CREATE TRIGGER update_geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON maintenance_records;
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gps_integrations_updated_at ON gps_integrations;
CREATE TRIGGER update_gps_integrations_updated_at
    BEFORE UPDATE ON gps_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 1: CORE SYSTEM / USER MANAGEMENT
-- ============================================

-- Password history table
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changed_by UUID REFERENCES users(id),
    reason VARCHAR(50) DEFAULT 'user_initiated'
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);

-- User permissions table (granular permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- Company settings table (for company-specific configurations)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, key)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);

-- ============================================
-- STAGE 2: FLEET MODULE - Extended Tables
-- ============================================

-- Trips/Routes tracking
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES vehicle_assignments(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    start_odometer DECIMAL(12, 2),
    end_odometer DECIMAL(12, 2),
    distance_km DECIMAL(10, 2),
    duration_minutes INTEGER,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    idle_time_minutes INTEGER DEFAULT 0,
    max_speed DECIMAL(6, 2),
    average_speed DECIMAL(6, 2),
    fuel_consumed DECIMAL(10, 3),
    route_geometry JSONB, -- GeoJSON line string
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_company_id ON trips(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(company_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_time ON trips(start_time);

-- Idle vehicle monitoring
CREATE TABLE IF NOT EXISTS idle_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_address TEXT,
    is_excessive BOOLEAN DEFAULT false,
    alert_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idle_events_company ON idle_events(company_id);
CREATE INDEX IF NOT EXISTS idx_idle_events_vehicle ON idle_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_idle_events_excessive ON idle_events(company_id, is_excessive) WHERE is_excessive = true;

-- Fuel cards
CREATE TABLE IF NOT EXISTS fuel_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    card_number VARCHAR(100) NOT NULL,
    card_provider VARCHAR(100),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    pin_code VARCHAR(20),
    monthly_limit DECIMAL(10, 2),
    current_balance DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'expired')),
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, card_number)
);

CREATE INDEX IF NOT EXISTS idx_fuel_cards_company ON fuel_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_cards_vehicle ON fuel_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_cards_driver ON fuel_cards(driver_id);

-- Fuel transactions
CREATE TABLE IF NOT EXISTS fuel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fuel_card_id UUID REFERENCES fuel_cards(id) ON DELETE SET NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    station_name VARCHAR(255),
    station_location VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    fuel_type VARCHAR(50),
    liters DECIMAL(10, 3) NOT NULL,
    price_per_liter DECIMAL(10, 2),
    total_cost DECIMAL(10, 2) NOT NULL, -- In KSH
    odometer_reading DECIMAL(12, 2),
    receipt_number VARCHAR(100),
    is_anomaly BOOLEAN DEFAULT false,
    anomaly_reason TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_transactions_company ON fuel_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_vehicle ON fuel_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_date ON fuel_transactions(company_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_anomaly ON fuel_transactions(company_id, is_anomaly) WHERE is_anomaly = true;

-- Expense tracking
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN ('fuel', 'maintenance', 'insurance', 'license', 'toll', 'parking', 'cleaning', 'repair', 'other')),
    amount DECIMAL(10, 2) NOT NULL, -- In KSH
    expense_date DATE NOT NULL,
    description TEXT,
    vendor_name VARCHAR(255),
    receipt_url TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_reimbursable BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(company_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(company_id, status);

-- Recurring maintenance schedules
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    interval_months INTEGER,
    interval_km DECIMAL(10, 2),
    description TEXT,
    estimated_cost DECIMAL(10, 2), -- In KSH
    is_active BOOLEAN DEFAULT true,
    last_service_date DATE,
    next_service_date DATE,
    next_service_km DECIMAL(12, 2),
    notification_days_before INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_company ON maintenance_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle ON maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due ON maintenance_schedules(next_service_date);

-- Triggers for Stage 2
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fuel_cards_updated_at ON fuel_cards;
CREATE TRIGGER update_fuel_cards_updated_at
    BEFORE UPDATE ON fuel_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_schedules_updated_at ON maintenance_schedules;
CREATE TRIGGER update_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 3: VEHICLE REQUISITION MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    request_number VARCHAR(50) NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    requester_name VARCHAR(200) NOT NULL,
    requester_department VARCHAR(100),
    requester_phone VARCHAR(50),
    purpose TEXT NOT NULL,
    destination VARCHAR(255),
    passengers_count INTEGER DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    preferred_vehicle_type VARCHAR(50),
    requires_driver BOOLEAN DEFAULT true,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'allocated', 'in_progress', 'completed', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejection_reason TEXT,
    allocated_vehicle_id UUID REFERENCES vehicles(id),
    allocated_driver_id UUID REFERENCES drivers(id),
    allocated_by UUID REFERENCES users(id),
    allocated_at TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    actual_start_odometer DECIMAL(12, 2),
    actual_end_odometer DECIMAL(12, 2),
    trip_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_requisitions_company ON vehicle_requisitions(company_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_requester ON vehicle_requisitions(requested_by);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON vehicle_requisitions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_dates ON vehicle_requisitions(start_date, end_date);

CREATE TABLE IF NOT EXISTS requisition_workflow_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES vehicle_requisitions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'allocated', 'started', 'completed', 'cancelled')),
    action_by UUID NOT NULL REFERENCES users(id),
    action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_req_workflow_req ON requisition_workflow_history(requisition_id);

CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requisition_submitted BOOLEAN DEFAULT true,
    requisition_approved BOOLEAN DEFAULT true,
    requisition_rejected BOOLEAN DEFAULT true,
    requisition_allocated BOOLEAN DEFAULT true,
    maintenance_due BOOLEAN DEFAULT true,
    alert_critical BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

DROP TRIGGER IF EXISTS update_requisitions_updated_at ON vehicle_requisitions;
CREATE TRIGGER update_requisitions_updated_at
    BEFORE UPDATE ON vehicle_requisitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 4: TRAINING MODULE (AI Quiz Included)
-- ============================================

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    target_roles VARCHAR(50)[] DEFAULT '{}',
    duration_minutes INTEGER,
    passing_score INTEGER DEFAULT 70,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_company ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(company_id, is_active);

CREATE TABLE IF NOT EXISTS course_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'image', 'interactive')),
    media_url TEXT,
    duration_seconds INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, slide_number)
);

CREATE INDEX IF NOT EXISTS idx_slides_course ON course_slides(course_id);

CREATE TABLE IF NOT EXISTS quiz_question_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching')),
    options JSONB NOT NULL,
    correct_answer TEXT,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_course ON quiz_question_templates(course_id);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    max_score INTEGER,
    percentage DECIMAL(5,2),
    passed BOOLEAN,
    time_taken_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON quiz_attempts(course_id);

CREATE TABLE IF NOT EXISTS quiz_questions_generated (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN,
    points INTEGER DEFAULT 1,
    earned_points INTEGER DEFAULT 0,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_generated_attempt ON quiz_questions_generated(attempt_id);

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    quiz_attempt_id UUID REFERENCES quiz_attempts(id),
    certificate_number VARCHAR(100) NOT NULL,
    user_full_name VARCHAR(200) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    completion_date DATE NOT NULL,
    expiry_date DATE,
    score_percentage DECIMAL(5,2),
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, certificate_number)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);

CREATE TABLE IF NOT EXISTS user_course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    current_slide_number INTEGER DEFAULT 1,
    slides_completed INTEGER[] DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course ON user_course_progress(course_id);

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slides_updated_at ON course_slides;
CREATE TRIGGER update_slides_updated_at
    BEFORE UPDATE ON course_slides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 5: FLEET AUDIT TOOL (Enterprise)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_template_name_per_company UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_audit_templates_company ON audit_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_templates_active ON audit_templates(company_id, is_active);

CREATE TABLE IF NOT EXISTS audit_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    weight INTEGER DEFAULT 1,
    evidence_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_audit_questions_template ON audit_questions(template_id);

CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES audit_templates(id),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    auditor_id UUID NOT NULL REFERENCES users(id),
    audit_reference VARCHAR(100),
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    total_score INTEGER,
    max_possible_score INTEGER,
    score_percentage DECIMAL(5,2),
    maturity_rating VARCHAR(20),
    notes TEXT,
    weather_conditions VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_sessions_company ON audit_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_template ON audit_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_vehicle ON audit_sessions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_status ON audit_sessions(company_id, status);

CREATE TABLE IF NOT EXISTS audit_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES audit_questions(id),
    score INTEGER NOT NULL CHECK (score IN (0, 1, 2)),
    notes TEXT,
    evidence_photos JSONB DEFAULT '[]',
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answered_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_responses_session ON audit_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_responses_question ON audit_responses(question_id);

CREATE TABLE IF NOT EXISTS audit_category_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    total_score INTEGER NOT NULL,
    max_possible_score INTEGER NOT NULL,
    score_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_scores_session ON audit_category_scores(session_id);

CREATE TABLE IF NOT EXISTS corrective_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    response_id UUID REFERENCES audit_responses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'overdue', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    completion_notes TEXT,
    evidence_photos JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_company ON corrective_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_session ON corrective_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_assigned ON corrective_actions(assigned_to);

DROP TRIGGER IF EXISTS update_audit_templates_updated_at ON audit_templates;
CREATE TRIGGER update_audit_templates_updated_at
    BEFORE UPDATE ON audit_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audit_sessions_updated_at ON audit_sessions;
CREATE TRIGGER update_audit_sessions_updated_at
    BEFORE UPDATE ON audit_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_corrective_actions_updated_at ON corrective_actions;
CREATE TRIGGER update_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT DATA INSERTIONS
-- ============================================

-- Insert default audit templates (10 templates × 10 questions = 100 total)
INSERT INTO audit_templates (company_id, name, description, category, is_system_template, is_active) VALUES
(NULL, 'Vehicle Maintenance Audit', 'Assessment of vehicle maintenance procedures and records', 'maintenance', true, true),
(NULL, 'Driver Safety Compliance', 'Evaluation of driver safety practices and compliance', 'safety', true, true),
(NULL, 'Fuel Management Audit', 'Review of fuel usage, tracking, and control measures', 'fuel', true, true),
(NULL, 'Fleet Utilization Analysis', 'Assessment of fleet efficiency and utilization rates', 'utilization', true, true),
(NULL, 'Accident Prevention Audit', 'Evaluation of accident prevention measures and records', 'safety', true, true),
(NULL, 'Environmental Compliance', 'Assessment of environmental impact and compliance', 'environmental', true, true),
(NULL, 'Cost Control Audit', 'Review of fleet operating costs and budgeting', 'financial', true, true),
(NULL, 'Driver Training Compliance', 'Evaluation of driver training records and certifications', 'training', true, true),
(NULL, 'Vehicle Security Audit', 'Assessment of vehicle security measures and procedures', 'security', true, true),
(NULL, 'Regulatory Compliance', 'Comprehensive review of regulatory compliance status', 'compliance', true, true)
ON CONFLICT DO NOTHING;

-- Insert sample questions for Vehicle Maintenance Audit template
DO $$
DECLARE
    template_id UUID;
BEGIN
    SELECT id INTO template_id FROM audit_templates WHERE name = 'Vehicle Maintenance Audit' AND is_system_template = true LIMIT 1;
    
    IF template_id IS NOT NULL THEN
        INSERT INTO audit_questions (company_id, template_id, question_number, question_text, description, category, weight, evidence_required)
        SELECT NULL, template_id, * FROM (VALUES
            (1, 'Are preventive maintenance schedules established and documented?', 'Check for documented maintenance schedules for all vehicles', 'documentation', 1, true),
            (2, 'Are maintenance records maintained for each vehicle?', 'Verify that service history is recorded and accessible', 'documentation', 1, true),
            (3, 'Is there a system for tracking vehicle mileage?', 'Check if odometer readings are regularly recorded', 'tracking', 1, false),
            (4, 'Are drivers trained to perform pre-trip inspections?', 'Verify driver training records for pre-trip checks', 'training', 1, true),
            (5, 'Is there a written maintenance policy?', 'Check for formal maintenance procedures document', 'documentation', 1, true),
            (6, 'Are service intervals based on manufacturer recommendations?', 'Verify maintenance intervals align with OEM specs', 'procedures', 1, false),
            (7, 'Is there a process for handling breakdowns?', 'Check for emergency repair procedures', 'procedures', 1, false),
            (8, 'Are maintenance costs tracked and analyzed?', 'Verify cost tracking system exists', 'financial', 1, true),
            (9, 'Is vehicle downtime minimized through planning?', 'Assess if scheduled maintenance reduces unplanned downtime', 'planning', 1, false),
            (10, 'Are spare parts inventory levels adequate?', 'Check spare parts availability for common repairs', 'inventory', 1, false)
        ) AS t(qnum, qtext, desc, cat, w, ev)
        ON CONFLICT (template_id, question_number) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- STAGE 6: RISK TRACKER (Corrective Actions Enhancement)
-- ============================================

-- Risk register for tracking identified risks
CREATE TABLE IF NOT EXISTS risk_register (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    risk_reference VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- operational, safety, compliance, financial
    likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5), -- 1=Rare, 5=Almost Certain
    impact INTEGER CHECK (impact BETWEEN 1 AND 5), -- 1=Negligible, 5=Catastrophic
    risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
    risk_level VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN likelihood * impact >= 15 THEN 'critical'
            WHEN likelihood * impact >= 10 THEN 'high'
            WHEN likelihood * impact >= 5 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    identified_by UUID REFERENCES users(id),
    identified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mitigating_actions TEXT,
    owner_id UUID REFERENCES users(id),
    review_date DATE,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'accepted', 'transferred', 'closed')),
    related_audit_session_id UUID REFERENCES audit_sessions(id) ON DELETE SET NULL,
    related_corrective_action_id UUID REFERENCES corrective_actions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, risk_reference)
);

CREATE INDEX IF NOT EXISTS idx_risk_register_company ON risk_register(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_status ON risk_register(company_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_register_level ON risk_register(company_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_register_owner ON risk_register(owner_id);

-- Risk history/audit trail
CREATE TABLE IF NOT EXISTS risk_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risk_register(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, updated, status_changed, reviewed
    action_by UUID NOT NULL REFERENCES users(id),
    action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_risk_history_risk ON risk_history(risk_id);

-- Inspection records (for photo evidence linking)
CREATE TABLE IF NOT EXISTS inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inspection_type VARCHAR(50) NOT NULL, -- pre_trip, post_trip, safety, maintenance
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    inspected_by UUID NOT NULL REFERENCES users(id),
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    overall_status VARCHAR(50) CHECK (overall_status IN ('pass', 'fail', 'conditional')),
    findings TEXT,
    corrective_action_needed BOOLEAN DEFAULT false,
    photos JSONB DEFAULT '[]',
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspections_company ON inspection_records(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspection_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspection_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspection_records(company_id, overall_status);

-- Link inspections to corrective actions
CREATE TABLE IF NOT EXISTS corrective_action_inspection_links (
    corrective_action_id UUID REFERENCES corrective_actions(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspection_records(id) ON DELETE CASCADE,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    linked_by UUID REFERENCES users(id),
    PRIMARY KEY (corrective_action_id, inspection_id)
);

DROP TRIGGER IF EXISTS update_risk_register_updated_at ON risk_register;
CREATE TRIGGER update_risk_register_updated_at
    BEFORE UPDATE ON risk_register
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 7: INVENTORY / STOCK MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_categories_company ON inventory_categories(company_id);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'piece', -- piece, liter, kg, meter, etc.
    unit_price DECIMAL(12, 2), -- In KSH
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(255),
    reorder_level INTEGER DEFAULT 10, -- Alert when stock falls below this
    reorder_quantity INTEGER DEFAULT 50, -- Recommended quantity to reorder
    current_stock INTEGER DEFAULT 0,
    location VARCHAR(255), -- Storage location
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items(company_id, current_stock, reorder_level) WHERE current_stock <= reorder_level;

-- Inventory transactions (stock in/out)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'adjustment', 'return', 'transfer')),
    quantity INTEGER NOT NULL, -- positive for stock in, negative for stock out
    unit_cost DECIMAL(12, 2), -- In KSH
    total_cost DECIMAL(12, 2), -- In KSH
    reference_type VARCHAR(50), -- maintenance_record, manual, etc.
    reference_id UUID,
    performed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_transactions_company ON inventory_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_date ON inventory_transactions(created_at);

-- Stock alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'expiring', 'overstock')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_company ON stock_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_unread ON stock_alerts(company_id, is_read) WHERE is_read = false;

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 10: INVOICES MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- fuel, maintenance, vehicle_hire, parts, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_cat_company ON invoice_categories(company_id);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES invoice_categories(id) ON DELETE SET NULL,
    invoice_type VARCHAR(50) NOT NULL CHECK (invoice_type IN ('fleet_operations', 'vehicle_hire', 'fuel', 'stock', 'maintenance', 'other')),
    vendor_name VARCHAR(255) NOT NULL,
    vendor_tax_id VARCHAR(100),
    vendor_address TEXT,
    vendor_contact VARCHAR(255),
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL, -- In KSH
    tax_amount DECIMAL(12, 2) DEFAULT 0, -- In KSH
    total_amount DECIMAL(12, 2) NOT NULL, -- In KSH
    currency VARCHAR(3) DEFAULT 'KSH',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'approved', 'paid', 'overdue', 'cancelled')),
    payment_method VARCHAR(50), -- bank_transfer, cash, mpesa, etc.
    payment_date DATE,
    payment_reference VARCHAR(255),
    validation_errors JSONB DEFAULT '[]',
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attachment_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date) WHERE status IN ('pending', 'validated', 'approved');
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(company_id, vendor_name);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL, -- In KSH
    total_price DECIMAL(12, 2) NOT NULL, -- In KSH
    reference_type VARCHAR(50), -- vehicle, inventory_item, etc.
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Invoice audit log
CREATE TABLE IF NOT EXISTS invoice_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, updated, validated, approved, paid, cancelled
    action_by UUID NOT NULL REFERENCES users(id),
    action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_invoice ON invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_date ON invoice_audit_log(action_at);

-- Invoice validation rules per company
CREATE TABLE IF NOT EXISTS invoice_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('required_field', 'max_amount', 'duplicate_check', 'vendor_whitelist')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_val_rules_company ON invoice_validation_rules(company_id);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STAGE 11: IMPORT/EXPORT
-- ============================================

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('vehicles', 'drivers', 'inventory', 'requisitions', 'audits', 'invoices')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_name VARCHAR(255) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    preview_data JSONB,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_company ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(company_id, status);

CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'excel', 'json')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    filters JSONB,
    file_url TEXT,
    row_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_company ON export_jobs(company_id);

-- ============================================
-- STAGE 12: INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- ai, erp, telematics, fuel, maintenance
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_company ON integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(company_id, integration_type);

-- ============================================
-- STAGE 14: SUPPLIERS & CONTRACTS (CHEVIN)
-- ============================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(50) NOT NULL CHECK (supplier_type IN ('vehicle_hire', 'fuel', 'maintenance', 'parts', 'insurance', 'other')),
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100),
    is_approved BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(company_id, supplier_type);

CREATE TABLE IF NOT EXISTS supplier_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('vehicle_hire', 'service', 'maintenance', 'supply', 'insurance')),
    contract_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    value DECIMAL(12, 2), -- In KSH
    currency VARCHAR(10) DEFAULT 'KSH',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
    payment_terms VARCHAR(100),
    auto_renewal BOOLEAN DEFAULT false,
    renewal_notice_days INTEGER DEFAULT 30,
    terms TEXT,
    document_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_company ON supplier_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON supplier_contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON supplier_contracts(end_date);

-- ============================================
-- STAGE 14: DOCUMENT MANAGEMENT (CHEVIN)
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('license', 'insurance', 'permit', 'registration', 'inspection', 'contract', 'other')),
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('vehicle', 'driver', 'company', 'contract')),
    entity_id UUID NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'valid' CHECK (status IN ('valid', 'expiring_soon', 'expired')),
    file_url TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(company_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(company_id, status);

-- ============================================
-- STAGE 14: ROUTE PLANNING (CHEVIN)
-- ============================================

CREATE TABLE IF NOT EXISTS planned_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    route_name VARCHAR(255) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    planned_date DATE NOT NULL,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255) NOT NULL,
    waypoints JSONB,
    estimated_distance DECIMAL(10, 2),
    estimated_duration INTEGER, -- minutes
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    start_odometer DECIMAL(10, 2),
    end_odometer DECIMAL(10, 2),
    actual_distance DECIMAL(10, 2),
    deviation_alerts JSONB DEFAULT '[]',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planned_routes_company ON planned_routes(company_id);
CREATE INDEX IF NOT EXISTS idx_planned_routes_vehicle ON planned_routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_planned_routes_date ON planned_routes(planned_date);
CREATE INDEX IF NOT EXISTS idx_planned_routes_status ON planned_routes(company_id, status);

-- Triggers for new tables
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON supplier_contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON supplier_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_planned_routes_updated_at ON planned_routes;
CREATE TRIGGER update_planned_routes_updated_at
    BEFORE UPDATE ON planned_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function initDatabase() {
  // Use DATABASE_URL if available (Render), otherwise fall back to individual vars
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
      };

  const pool = new Pool(poolConfig);

  try {
    const dbName = process.env.DB_NAME || 'nextbotics_fleet_pro';
    
    // Check if database exists
    const dbExists = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbExists.rowCount === 0) {
      await pool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created`);
    } else {
      console.log(`ℹ️ Database "${dbName}" already exists`);
    }

    await pool.end();

    // Connect to the actual database and run schema
    const appPoolConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: dbName,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
        };

    const appPool = new Pool(appPoolConfig);

    await appPool.query(initSQL);
    console.log('✅ Database schema initialized');
    
    await appPool.end();
    console.log('🚀 Database ready!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}

export { initDatabase };
