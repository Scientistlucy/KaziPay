CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL, password_hash VARCHAR(255),
  first_name VARCHAR(100), last_name VARCHAR(100), phone VARCHAR(30),
  role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','ADMIN','MANAGER','MEMBER','CLIENT')),
  client_id UUID, default_hourly_rate NUMERIC(10,2), email_verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ, last_login_at TIMESTAMPTZ, totp_secret_enc BYTEA,
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);
CREATE UNIQUE INDEX uq_users_tenant_email_lower ON users (tenant_id, lower(email));

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id), family_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ, replaced_by UUID, user_agent VARCHAR(255), ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE one_time_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('PASSWORD_RESET','EMAIL_VERIFY','MAGIC_LOGIN')),
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL,
  client_id UUID, token_hash CHAR(64) NOT NULL UNIQUE, invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL, accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
SELECT enable_tenant_rls('users');
SELECT enable_tenant_rls('refresh_tokens');
SELECT enable_tenant_rls('one_time_tokens');
SELECT enable_tenant_rls('invitations');

CREATE OR REPLACE FUNCTION resolve_one_time_token(token_hash_value CHAR(64), purpose_value VARCHAR(20))
RETURNS TABLE (id UUID, tenant_id UUID, user_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, tenant_id, user_id FROM one_time_tokens
  WHERE token_hash = token_hash_value AND purpose = purpose_value
    AND used_at IS NULL AND expires_at > now()
$$;
REVOKE ALL ON FUNCTION resolve_one_time_token(CHAR(64), VARCHAR(20)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_one_time_token(CHAR(64), VARCHAR(20)) TO kazipay_app;

CREATE OR REPLACE FUNCTION resolve_invitation_token(token_hash_value CHAR(64))
RETURNS TABLE (id UUID, tenant_id UUID, email VARCHAR(255), role VARCHAR(20), invited_by UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, tenant_id, email, role, invited_by FROM invitations
  WHERE token_hash = token_hash_value AND accepted_at IS NULL AND expires_at > now()
$$;
REVOKE ALL ON FUNCTION resolve_invitation_token(CHAR(64)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_invitation_token(CHAR(64)) TO kazipay_app;

CREATE OR REPLACE FUNCTION resolve_refresh_token(token_hash_value CHAR(64))
RETURNS TABLE (id UUID, tenant_id UUID, user_id UUID, family_id UUID, expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, tenant_id, user_id, family_id, expires_at, revoked_at FROM refresh_tokens
  WHERE token_hash = token_hash_value
$$;
REVOKE ALL ON FUNCTION resolve_refresh_token(CHAR(64)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_refresh_token(CHAR(64)) TO kazipay_app;