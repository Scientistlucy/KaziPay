DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kazipay_app') THEN
    CREATE ROLE kazipay_app LOGIN PASSWORD 'kazipay_app' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT CONNECT ON DATABASE kazipay TO kazipay_app;
GRANT USAGE ON SCHEMA public TO kazipay_app;