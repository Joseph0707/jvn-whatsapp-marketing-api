-- ============================================================
-- JVN WhatsApp Marketing API — Row Level Security Policies
-- ============================================================
-- Multi-tenant isolation at the PostgreSQL level.
-- Each query must SET app.current_tenant_id = '<uuid>' before execution.
-- ============================================================

-- ── Helper: Create a reusable tenant check function ─────────
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Enable RLS on tenant-scoped tables ──────────────────────

-- Sequences
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sequences ON sequences
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Sequence Steps (via sequence join — but steps belong to a sequence which belongs to a tenant)
-- For simplicity and performance, we enforce RLS on sequences and use JOIN-based access for steps.

-- Scheduled Messages
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_scheduled ON scheduled_messages
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_contacts ON contacts
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Conversions
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_conversions ON conversions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Attributions
ALTER TABLE attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_attributions ON attributions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Webhook Events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_webhook_events ON webhook_events
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- ── Bypass RLS for the application service role ─────────────
-- In production, create a dedicated role for the app:
--
--   CREATE ROLE app_service LOGIN PASSWORD 'secure_password';
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO app_service;
--
-- The app must SET app.current_tenant_id before each tenant-scoped query.
-- FORCE ROW LEVEL SECURITY ensures even the table owner respects policies.
