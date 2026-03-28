-- Comprehensive migration to add all missing columns
-- This fixes schema mismatches between old and new deployments

-- Vehicles table columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS minor_service_interval INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS medium_service_interval INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS major_service_interval INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS target_consumption_rate DECIMAL(5,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_of_purchase INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS replacement_mileage INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS replacement_age INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service_due DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS defect_notes TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS defect_reported_at TIMESTAMP;

-- Staff table columns
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_no VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS safety_score INTEGER DEFAULT 100;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS comments TEXT;

-- Audit templates
ALTER TABLE audit_templates ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);

-- Job cards columns
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS job_card_number VARCHAR(100);
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';

-- Invoice columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS job_card_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vehicle_id UUID;

-- Routes columns
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_date DATE;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS driver1_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS driver2_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS co_driver_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS target_km DECIMAL(10,2);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS actual_km DECIMAL(10,2);

-- Requisitions columns
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS inspection_passed BOOLEAN;

-- GPS Tracking tables
CREATE TABLE IF NOT EXISTS gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
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
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
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
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INTEGER NOT NULL,
  alert_on_enter BOOLEAN DEFAULT true,
  alert_on_exit BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gps_tracking_vehicle_id ON gps_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_history_vehicle_id ON gps_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_history_recorded_at ON gps_history(recorded_at);
