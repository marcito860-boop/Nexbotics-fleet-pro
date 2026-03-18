-- Migration: Add invoices and related tables
-- Created: 2026-03-19

-- Invoice categories
CREATE TABLE IF NOT EXISTS invoice_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_categories_company ON invoice_categories(company_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES invoice_categories(id) ON DELETE SET NULL,
  invoice_type VARCHAR(50) DEFAULT 'other',
  vendor_name VARCHAR(255) NOT NULL,
  vendor_tax_id VARCHAR(100),
  vendor_address TEXT,
  vendor_contact VARCHAR(255),
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(100),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_name);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Invoice audit log
CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  action_by UUID NOT NULL REFERENCES users(id),
  action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  notes TEXT
);

CREATE INDEX idx_invoice_audit_invoice ON invoice_audit_log(invoice_id);
