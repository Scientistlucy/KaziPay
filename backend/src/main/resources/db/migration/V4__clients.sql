CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL, company VARCHAR(255), email VARCHAR(255), phone VARCHAR(30),
  billing_email VARCHAR(255), address TEXT, country VARCHAR(100), tax_id VARCHAR(50),
  default_currency CHAR(3) NOT NULL DEFAULT 'KES', payment_terms_days INT NOT NULL DEFAULT 14,
  notes TEXT, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_clients_tenant_status ON clients(tenant_id, status);
CREATE INDEX idx_clients_tenant_email ON clients(tenant_id, lower(email));

CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id), name VARCHAR(255) NOT NULL, email VARCHAR(255),
  phone VARCHAR(30), role_title VARCHAR(100), is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_client_contacts_tenant_client ON client_contacts(tenant_id, client_id);
CREATE UNIQUE INDEX uq_primary_client_contact ON client_contacts(client_id) WHERE is_primary = TRUE AND deleted_at IS NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients(id);
SELECT enable_tenant_rls('clients');
SELECT enable_tenant_rls('client_contacts');