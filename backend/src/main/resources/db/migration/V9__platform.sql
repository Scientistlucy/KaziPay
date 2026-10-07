CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id),
  actor_id UUID, actor_type VARCHAR(20) NOT NULL DEFAULT 'USER', action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50), entity_id UUID, before JSONB, after JSONB, ip INET,
  user_agent VARCHAR(255), correlation_id VARCHAR(64), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(tenant_id, entity_type, entity_id, created_at DESC);
REVOKE UPDATE, DELETE ON audit_logs FROM kazipay_app;

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  aggregate_type VARCHAR(50) NOT NULL, aggregate_id UUID NOT NULL, event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0, last_error TEXT
);
CREATE INDEX idx_outbox_unpublished ON outbox_events(created_at) WHERE published_at IS NULL;

CREATE TABLE idempotency_keys (
  tenant_id UUID NOT NULL, key VARCHAR(100) NOT NULL, request_hash CHAR(64) NOT NULL,
  response_status INT, response_body JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (tenant_id, key)
);

CREATE TABLE shedlock (
  name VARCHAR(64) PRIMARY KEY, lock_until TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL, locked_by VARCHAR(255) NOT NULL
);

SELECT enable_tenant_rls('outbox_events');
SELECT enable_tenant_rls('idempotency_keys');
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON audit_logs FOR SELECT USING (tenant_id = app_tenant_id());
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (tenant_id IS NULL OR tenant_id = app_tenant_id());