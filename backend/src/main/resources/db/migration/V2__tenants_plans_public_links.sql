CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(63) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$'),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  logo_url VARCHAR(500), primary_color VARCHAR(7),
  timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
  default_currency CHAR(3) NOT NULL DEFAULT 'KES', locale VARCHAR(10) NOT NULL DEFAULT 'en',
  business_email VARCHAR(255), business_phone VARCHAR(50), address TEXT, tax_id VARCHAR(50),
  invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV', next_invoice_seq BIGINT NOT NULL DEFAULT 1,
  default_terms_days INT NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL, price_minor BIGINT NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'KES',
  limits JSONB NOT NULL, features JSONB NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), token_hash CHAR(64) NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('INVOICE','PROPOSAL','CONTRACT','MAGIC_LOGIN')),
  entity_id UUID NOT NULL, expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_public_links_entity ON public_links(entity_type, entity_id);