-- V9 enabled RLS on audit_logs with its own read/insert policies but did not force it, so the table owner
-- could bypass them. Every other tenant table forces RLS; apply the same rule here. The existing
-- audit_read and audit_insert policies are kept (inserts with a NULL tenant_id remain allowed for system events).
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
