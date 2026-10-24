DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kazipay_owner') THEN
    CREATE ROLE kazipay_owner LOGIN PASSWORD 'kazipay_owner';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kazipay_app') THEN
    CREATE ROLE kazipay_app LOGIN PASSWORD 'kazipay_app' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT CONNECT ON DATABASE kazipay TO kazipay_app;
GRANT USAGE ON SCHEMA public TO kazipay_app;
-- Tables, sequences and functions created by migrations (as kazipay_owner) are usable by the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE kazipay_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kazipay_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kazipay_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kazipay_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kazipay_owner IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO kazipay_app;