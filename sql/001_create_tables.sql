-- ============================================================
-- JVN WhatsApp Marketing API — Initial Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tenants ──────────────────────────────────────────────────
-- Each tenant represents a WhatsApp Business Account
CREATE TABLE tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    phone_number_id TEXT NOT NULL UNIQUE,  -- Meta phone_number_id → tenant mapping
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Contacts ─────────────────────────────────────────────────
-- WhatsApp contacts per tenant
CREATE TABLE contacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone         TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone);

-- ── Sequences ────────────────────────────────────────────────
-- Marketing automation sequences
CREATE TABLE sequences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    trigger_event TEXT NOT NULL DEFAULT 'free_window_opened',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sequences_tenant_trigger ON sequences(tenant_id, trigger_event, is_active);

-- ── Sequence Steps ───────────────────────────────────────────
-- Ordered steps within a sequence
CREATE TABLE sequence_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id     UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order      INT NOT NULL,
    template_id     TEXT NOT NULL,           -- WhatsApp template identifier
    delay_minutes   INT NOT NULL DEFAULT 0,  -- Delay RELATIVE to previous step
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sequence_id, step_order)
);

CREATE INDEX idx_steps_sequence_order ON sequence_steps(sequence_id, step_order);

-- ── Scheduled Messages ──────────────────────────────────────
-- Messages queued by the sequence engine
CREATE TABLE scheduled_messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_phone     TEXT NOT NULL,
    step_id           UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'expired', 'cancelled', 'failed')),
    scheduled_at      TIMESTAMPTZ NOT NULL,
    window_expires_at TIMESTAMPTZ NOT NULL,  -- 72h from trigger event
    sent_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tenant_contact ON scheduled_messages(tenant_id, contact_phone, status);
CREATE INDEX idx_scheduled_status ON scheduled_messages(status, scheduled_at);

-- ── Conversions ─────────────────────────────────────────────
-- Conversion events (purchases, sign-ups, etc.)
CREATE TABLE conversions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_phone   TEXT NOT NULL,
    order_id        TEXT NOT NULL,
    order_amount    INT NOT NULL DEFAULT 0,  -- Amount in CENTS
    converted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, order_id)              -- Prevent duplicate conversions
);

CREATE INDEX idx_conversions_tenant ON conversions(tenant_id, converted_at);

-- ── Attributions ────────────────────────────────────────────
-- Links a conversion to the message that triggered it (48h window)
CREATE TABLE attributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id   UUID NOT NULL REFERENCES conversions(id) ON DELETE CASCADE UNIQUE,
    message_id      UUID NOT NULL REFERENCES scheduled_messages(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source          TEXT NOT NULL DEFAULT 'message'
                    CHECK (source IN ('message', 'direct')),
    attributed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attributions_message ON attributions(message_id);
CREATE INDEX idx_attributions_tenant ON attributions(tenant_id);

-- ── Webhook Events Log ──────────────────────────────────────
-- Audit trail of all processed webhook events
CREATE TABLE webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        TEXT NOT NULL UNIQUE,     -- Meta message ID for idempotency
    tenant_id       UUID REFERENCES tenants(id),
    event_type      TEXT NOT NULL
                    CHECK (event_type IN ('message_received', 'free_window_opened', 'message_read', 'message_failed')),
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
