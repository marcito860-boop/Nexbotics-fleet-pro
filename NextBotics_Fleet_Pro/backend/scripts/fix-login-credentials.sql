-- ============================================
-- FIX LOGIN CREDENTIALS - Run this SQL directly on your database
-- ============================================

-- 1. First, clean up any broken demo users (missing company_id or names)
DELETE FROM users WHERE email LIKE '%@nextfleet.com' OR email LIKE '%@fleet.com';
DELETE FROM staff WHERE email LIKE '%@nextfleet.com' OR email LIKE '%@fleet.com';
DELETE FROM companies WHERE slug = 'nextfleet-logistics' OR slug = 'test-company' OR slug = 'debug';

-- 2. Create the demo company
INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
VALUES (
  gen_random_uuid(),
  'NextFleet Logistics',
  'nextfleet-logistics',
  'basic',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET name = 'NextFleet Logistics'
RETURNING id;

-- Note: Copy the company_id from above and replace COMPANY_ID_HERE below

-- 3. Create test users with proper data
-- First, get the company ID
DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_password_hash VARCHAR(255);
BEGIN
  -- Get the company ID
  SELECT id INTO v_company_id FROM companies WHERE slug = 'nextfleet-logistics';
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Create password hash for 'Manager123!' (bcrypt)
  -- This is a pre-computed bcrypt hash
  v_password_hash := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  -- Create Manager user
  v_user_id := gen_random_uuid();
  INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
  VALUES (v_user_id, v_company_id, 'manager@nextfleet.com', v_password_hash, 'Morgan', 'Manager', 'manager', true, false);
  
  -- Create Admin user
  v_user_id := gen_random_uuid();
  INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
  VALUES (v_user_id, v_company_id, 'admin@nextfleet.com', v_password_hash, 'Alex', 'Administrator', 'admin', true, false);
  
  -- Create Staff user  
  v_user_id := gen_random_uuid();
  INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
  VALUES (v_user_id, v_company_id, 'staff@nextfleet.com', v_password_hash, 'Sam', 'Staff', 'staff', true, false);
  
  RAISE NOTICE '✅ Users created successfully!';
  RAISE NOTICE '   Email: manager@nextfleet.com, Password: Manager123!';
  RAISE NOTICE '   Email: admin@nextfleet.com, Password: Manager123!';
  RAISE NOTICE '   Email: staff@nextfleet.com, Password: Manager123!';
  RAISE NOTICE '   Company Slug: nextfleet-logistics';
END $$;

-- 4. Verify the users were created
SELECT id, email, first_name, last_name, role, is_active, company_id 
FROM users 
WHERE email LIKE '%@nextfleet.com';
