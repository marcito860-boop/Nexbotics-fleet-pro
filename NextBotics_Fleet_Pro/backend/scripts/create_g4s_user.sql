-- Create G4S company and admin user for NextBotics Fleet Pro
-- Run this in Render PostgreSQL console

-- Generate UUID for G4S company
WITH g4s_company AS (
  INSERT INTO companies (id, name, slug, subscription_plan, subscription_status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'G4S Security Services',
    'g4s-security',
    'enterprise',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (slug) DO UPDATE SET 
    name = 'G4S Security Services',
    updated_at = CURRENT_TIMESTAMP
  RETURNING id
),
-- Create admin user for G4S
g4s_user AS (
  INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password, created_at, updated_at)
  SELECT 
    gen_random_uuid(),
    g4s_company.id,
    'pilot@g4s.com',
    '$2a$10$efiw1vjkz1v5DrMjKQt0MO2X769tcmzIDPKKf1Hw6gW8r7b1JdM0.', -- bcrypt hash of 'G4SPilot2024!'
    'G4S',
    'Pilot',
    'admin',
    true,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM g4s_company
  ON CONFLICT (email) DO UPDATE SET
    company_id = (SELECT id FROM g4s_company),
    password_hash = '$2a$10$efiw1vjkz1v5DrMjKQt0MO2X769tcmzIDPKKf1Hw6gW8r7b1JdM0.',
    role = 'admin',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, company_id, email, role
),
-- Create staff record for G4S admin
g4s_staff AS (
  INSERT INTO staff (id, company_id, staff_no, staff_name, email, phone, department, branch, role, safety_score, created_at)
  SELECT 
    gen_random_uuid(),
    g4s_user.company_id,
    'G4S001',
    'G4S Pilot Admin',
    'pilot@g4s.com',
    '+254 700 000 000',
    'Security Operations',
    'Head Office',
    'Manager',
    95,
    CURRENT_TIMESTAMP
  FROM g4s_user
  ON CONFLICT (email) DO UPDATE SET
    company_id = (SELECT company_id FROM g4s_user),
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, staff_name
)
SELECT 
  'G4S setup complete:' as message,
  (SELECT email FROM g4s_user) as admin_email,
  (SELECT role FROM g4s_user) as role,
  (SELECT name FROM companies WHERE slug = 'g4s-security') as company_name;

-- Verify setup
SELECT 
  u.email as user_email,
  u.role,
  u.is_active,
  c.name as company_name,
  s.staff_name
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN staff s ON u.email = s.email
WHERE u.email = 'pilot@g4s.com';
