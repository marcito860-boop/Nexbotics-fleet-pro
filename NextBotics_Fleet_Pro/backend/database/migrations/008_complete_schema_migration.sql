-- ============================================
-- COMPREHENSIVE SCHEMA MIGRATION
-- Fixes ALL missing columns for Render deployment
-- ============================================

-- 1. VEHICLES TABLE - Add all missing columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_num VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_of_purchase INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS replacement_mileage INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS replacement_age INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make_model VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS branch VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS minor_service_interval INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS medium_service_interval INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS major_service_interval INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS target_consumption_rate DECIMAL(5,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_mileage INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service_due DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS defect_notes TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS defect_reported_at TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 2. STAFF TABLE - Add all missing columns
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_no VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS branch VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Driver';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS safety_score INTEGER DEFAULT 100;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 3. ROUTES TABLE - Add all missing columns
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_date DATE;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS driver1_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS driver2_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS co_driver_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS start_location VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS end_location VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS target_km DECIMAL(10,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS actual_km DECIMAL(10,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS target_fuel_consumption DECIMAL(8,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS actual_fuel DECIMAL(8,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS target_consumption_rate DECIMAL(5,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS actual_consumption_rate DECIMAL(5,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS variance DECIMAL(8,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled';
ALTER TABLE routes ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. FUEL_RECORDS TABLE - Add all missing columns
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS fuel_date DATE;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS liters DECIMAL(8,2);
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS km_per_liter DECIMAL(6,2);
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS cost_per_km DECIMAL(8,4);
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS previous_odometer INTEGER;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS current_odometer INTEGER;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS distance_km INTEGER;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS station VARCHAR(255);
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. REQUISITIONS TABLE - Add all missing columns
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS destination VARCHAR(255);
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS inspection_passed BOOLEAN;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS odometer_start INTEGER;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS odometer_end INTEGER;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. ACCIDENTS TABLE - Add all missing columns
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS case_number VARCHAR(100);
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS accident_date DATE;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS accident_time TIME;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS severity VARCHAR(20);
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS damage_description TEXT;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS injuries INTEGER DEFAULT 0;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS fatalities INTEGER DEFAULT 0;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS police_report_number VARCHAR(100);
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS insurance_claim_number VARCHAR(100);
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Open';
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE accidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7. JOB_CARDS TABLE - Add all missing columns
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS job_card_number VARCHAR(50);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS defect_description TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS repair_type VARCHAR(100);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS service_provider VARCHAR(100);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS target_hours DECIMAL(5,2);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS reported_by UUID;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS assigned_technician UUID;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS repair_notes TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 8. REPAIRS TABLE - Add all missing columns
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS date_in DATE;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS preventative_maintenance TEXT;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS breakdown_description TEXT;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS odometer_reading INTEGER;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS assigned_technician VARCHAR(255);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS repairs_start_time TIMESTAMP;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS date_out DATE;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS repairs_end_time TIMESTAMP;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS actual_repair_hours DECIMAL(5,2);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS target_repair_hours DECIMAL(5,2);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS productivity_ratio DECIMAL(5,2);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS garage_name VARCHAR(255);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 9. AUDIT_TEMPLATES - Add missing column
ALTER TABLE audit_templates ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);

-- 10. INVOICES - Add missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS job_card_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vehicle_id UUID;

-- 11. GPS TRACKING TABLES (Create if not exist) - NO FK constraints to avoid dependency issues
CREATE TABLE IF NOT EXISTS gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID,
  latitude DECIMAL(10, 8) NOT NULL DEFAULT -1.2921,
  longitude DECIMAL(11, 8) NOT NULL DEFAULT 36.8219,
  speed DECIMAL(5, 2) DEFAULT 0,
  heading DECIMAL(5, 2) DEFAULT 0,
  ignition_status VARCHAR(10) DEFAULT 'off',
  odometer INTEGER,
  fuel_level INTEGER,
  battery_voltage DECIMAL(4, 2),
  accuracy INTEGER DEFAULT 10,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vehicle_id)
);

CREATE TABLE IF NOT EXISTS gps_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2) DEFAULT 0,
  heading DECIMAL(5, 2) DEFAULT 0,
  ignition_status VARCHAR(10) DEFAULT 'off',
  odometer INTEGER,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accuracy INTEGER DEFAULT 10
);

CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INTEGER NOT NULL,
  alert_on_enter BOOLEAN DEFAULT true,
  alert_on_exit BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_department ON vehicles(department);
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON vehicles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_num);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON staff(deleted_at);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver1_id ON routes(driver1_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(route_date);

-- Fuel records indexes
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_records(fuel_date);

-- Requisitions indexes
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requested_by ON requisitions(requested_by);
CREATE INDEX IF NOT EXISTS idx_requisitions_vehicle_id ON requisitions(vehicle_id);

-- Repairs indexes
CREATE INDEX IF NOT EXISTS idx_repairs_vehicle_id ON repairs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);

-- Accidents indexes
CREATE INDEX IF NOT EXISTS idx_accidents_vehicle_id ON accidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_accidents_driver_id ON accidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_accidents_date ON accidents(accident_date);
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);

-- Job cards indexes
CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle_id ON job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_number ON job_cards(job_card_number);

-- GPS indexes
CREATE INDEX IF NOT EXISTS idx_gps_tracking_vehicle_id ON gps_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_last_updated ON gps_tracking(last_updated);
CREATE INDEX IF NOT EXISTS idx_gps_history_vehicle_id ON gps_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_history_recorded_at ON gps_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_geofences_vehicle_id ON geofences(vehicle_id);
