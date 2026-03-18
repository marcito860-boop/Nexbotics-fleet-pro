-- Seed Demo Data for NextBotics Fleet Pro
-- Run this SQL to create demo company and users

-- Create demo company
INSERT INTO companies (id, name, slug, email, phone, address, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'NextFleet Logistics',
  'nextfleet-logistics',
  'info@nextfleet.com',
  '+1 (555) 123-4567',
  '123 Fleet Street, Logistics City, LC 12345',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;

-- Create demo users (passwords are 'Admin123!', 'Manager123!', 'Staff123!' - hashed)
INSERT INTO users (id, company_id, email, password_hash, role, is_active, created_at, updated_at)
VALUES 
  ('u1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@nextfleet.com', '$2a$10$YourHashedPasswordHere', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('u2a2b3c4-d5e6-7890-abcd-ef1234567891', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'manager@nextfleet.com', '$2a$10$YourHashedPasswordHere', 'manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('u3a2b3c4-d5e6-7890-abcd-ef1234567892', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'staff@nextfleet.com', '$2a$10$YourHashedPasswordHere', 'viewer', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Note: The password hashes above are placeholders. 
-- You need to use actual bcrypt hashes for: Admin123!, Manager123!, Staff123!
-- Or use the super admin to create users through the UI.
