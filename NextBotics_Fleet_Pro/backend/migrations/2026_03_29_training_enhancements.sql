-- Training Module Database Schema Enhancements
-- Run this to add support for the enhanced training features

-- Quiz questions generated table (stores questions for each attempt)
CREATE TABLE IF NOT EXISTS quiz_questions_generated (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    options JSONB NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    question_order INTEGER DEFAULT 0,
    user_answer VARCHAR(255),
    is_correct BOOLEAN,
    earned_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz unlock requests table
CREATE TABLE IF NOT EXISTS quiz_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    denial_reason TEXT
);

-- Create unique index for pending requests instead of partial unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_unlock_requests 
ON quiz_unlock_requests (user_id, course_id) 
WHERE status = 'pending';

-- Add permanent_notes column to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS permanent_notes TEXT;

-- Enhanced certificates table
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS user_credentials VARCHAR(255);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_data TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_attempt ON quiz_questions_generated(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_unlock_requests_company ON quiz_unlock_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_quiz_unlock_requests_user ON quiz_unlock_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_unlock_requests_status ON quiz_unlock_requests(status);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_company ON certificates(company_id);

-- Insert sample courses with notes if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM courses LIMIT 1) THEN
        INSERT INTO courses (company_id, title, description, category, passing_score, is_active, target_roles)
        VALUES 
            ((SELECT id FROM companies LIMIT 1), 'Defensive Driving Fundamentals', 'Learn essential defensive driving techniques', 'defensive-driving', 70, true, ARRAY['driver', 'staff']),
            ((SELECT id FROM companies LIMIT 1), 'Vehicle Inspection & Maintenance', 'Comprehensive vehicle inspection procedures', 'vehicle-inspection', 70, true, ARRAY['driver', 'staff']),
            ((SELECT id FROM companies LIMIT 1), 'Fuel Efficiency & Eco-Driving', 'Techniques to reduce fuel consumption', 'fuel-efficiency', 70, true, ARRAY['driver']),
            ((SELECT id FROM companies LIMIT 1), 'Accident Prevention & Response', 'Prevent accidents and respond appropriately', 'safety', 80, true, ARRAY['driver', 'staff']),
            ((SELECT id FROM companies LIMIT 1), 'Regulatory Compliance & HOS', 'DOT regulations and hours of service', 'compliance', 80, true, ARRAY['driver']),
            ((SELECT id FROM companies LIMIT 1), 'Cargo Securement', 'Proper cargo loading and securement', 'cargo-securement', 75, true, ARRAY['driver']),
            ((SELECT id FROM companies LIMIT 1), 'Hazardous Materials Transportation', 'Hazmat transportation regulations', 'hazmat', 85, true, ARRAY['driver']),
            ((SELECT id FROM companies LIMIT 1), 'Security & Anti-Terrorism', 'Protect vehicles, cargo, and personnel', 'security', 70, true, ARRAY['driver', 'staff']);
    END IF;
END $$;
