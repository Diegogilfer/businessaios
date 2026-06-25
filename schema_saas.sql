-- BusinessAIOS SaaS Schema (FASE 11)

CREATE TABLE IF NOT EXISTS tenants (
    id            UUID PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    plan          TEXT DEFAULT 'free',
    status        TEXT DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key           TEXT UNIQUE NOT NULL,
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    name          TEXT,
    status        TEXT DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    plan                TEXT NOT NULL,
    status              TEXT DEFAULT 'active',
    start_date          TIMESTAMPTZ,
    next_billing_date   TIMESTAMPTZ,
    amount              NUMERIC(8,2),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Add tenant_id to existing tables (migration)
ALTER TABLE tasks ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE executions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE global_knowledge ADD COLUMN tenant_id UUID REFERENCES tenants(id);

CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
