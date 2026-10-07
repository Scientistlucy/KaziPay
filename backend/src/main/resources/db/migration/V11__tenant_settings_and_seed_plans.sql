ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS invoice_number_format VARCHAR(50) NOT NULL DEFAULT 'INV-{YYYY}-{SEQ:4}';

CREATE TABLE tenant_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(50) NOT NULL, percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  inclusive BOOLEAN NOT NULL DEFAULT FALSE, is_default BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_tenant_tax_rates_tenant ON tenant_tax_rates(tenant_id);
SELECT enable_tenant_rls('tenant_tax_rates');

CREATE TABLE tenant_onboarding (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  business_details_completed BOOLEAN NOT NULL DEFAULT FALSE,
  branding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  tax_settings_completed BOOLEAN NOT NULL DEFAULT FALSE,
  gateway_completed BOOLEAN NOT NULL DEFAULT FALSE,
  first_client_completed BOOLEAN NOT NULL DEFAULT FALSE,
  first_invoice_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SELECT enable_tenant_rls('tenant_onboarding');

INSERT INTO plans (code, name, price_minor, currency, limits, features, active) VALUES
  ('FREE', 'Free', 0, 'KES',
   '{"clients":1,"activeProjects":1,"users":1,"storageBytes":104857600}'::jsonb,
   '{"basicInvoicing":true,"payments":false,"reminders":false}'::jsonb, TRUE),
  ('STARTER', 'Starter', 150000, 'KES',
   '{"clients":5,"activeProjects":-1,"users":2,"storageBytes":2147483648}'::jsonb,
   '{"basicInvoicing":true,"payments":false,"reminders":false}'::jsonb, TRUE),
  ('PROFESSIONAL', 'Professional', 450000, 'KES',
   '{"clients":-1,"activeProjects":-1,"users":10,"storageBytes":21474836480}'::jsonb,
   '{"basicInvoicing":true,"payments":true,"reminders":true,"recurringInvoices":true}'::jsonb, TRUE),
  ('BUSINESS', 'Business', 1200000, 'KES',
   '{"clients":-1,"activeProjects":-1,"users":-1,"storageBytes":107374182400}'::jsonb,
   '{"basicInvoicing":true,"payments":true,"reminders":true,"whiteLabel":true,"customDomain":true,"apiAccess":true}'::jsonb, TRUE)
ON CONFLICT (code) DO NOTHING;