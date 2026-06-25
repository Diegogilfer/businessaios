-- ============================================================
-- BusinessAIOS - schema_fase11.sql
-- FASE 11: SaaS Multi-Tenant — RLS + usage tracking + Stripe
-- Ejecutar DESPUÉS del schema principal y schema_chat.sql
-- ============================================================

-- ── Columnas faltantes en tenants ───────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- ── Columnas faltantes en subscriptions ─────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ── Columnas tenant_id en TODAS las tablas que falten ────────
ALTER TABLE conversations      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE chat_messages      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE agent_memories     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE neuro_profiles     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE webhook_endpoints  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE scheduled_jobs     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE audit_log          ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';

-- ── Índices de tenant_id faltantes ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memories_tenant      ON agent_memories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant         ON audit_log(tenant_id);

-- ── Tabla de uso por recurso (para analytics de billing) ─────
CREATE TABLE IF NOT EXISTS usage_events (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource    TEXT        NOT NULL,  -- "tasks" | "executions" | "chat_messages" | "arbitrage_scans"
    quantity    INTEGER     DEFAULT 1,
    metadata    JSONB       DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_tenant   ON usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_resource ON usage_events(resource);
CREATE INDEX IF NOT EXISTS idx_usage_created  ON usage_events(created_at DESC);

-- ── RPC: resumen de uso del mes para un tenant ───────────────
CREATE OR REPLACE FUNCTION get_tenant_usage_summary(p_tenant_id UUID)
RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'tasks_this_month',
            (SELECT COUNT(*) FROM tasks
             WHERE tenant_id = p_tenant_id
             AND created_at >= date_trunc('month', NOW())),
        'executions_this_month',
            (SELECT COUNT(*) FROM executions
             WHERE tenant_id = p_tenant_id
             AND created_at >= date_trunc('month', NOW())),
        'chat_messages_today',
            (SELECT COUNT(*) FROM chat_messages
             WHERE tenant_id = p_tenant_id
             AND created_at >= date_trunc('day', NOW())),
        'knowledge_entries',
            (SELECT COUNT(*) FROM global_knowledge
             WHERE tenant_id = p_tenant_id),
        'conversations_total',
            (SELECT COUNT(*) FROM conversations
             WHERE tenant_id = p_tenant_id)
    );
$$;

-- ── RLS — Habilitar en producción ────────────────────────────
-- Cuando uses Supabase Auth con JWT, habilita estas políticas:
-- (Mantenerlas comentadas en desarrollo local)

-- ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE executions       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE global_knowledge ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_memories   ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "tenant_tasks"    ON tasks            USING (tenant_id::text = current_setting('app.tenant_id', true));
-- CREATE POLICY "tenant_execs"    ON executions        USING (tenant_id::text = current_setting('app.tenant_id', true));
-- CREATE POLICY "tenant_convs"    ON conversations     USING (tenant_id::text = current_setting('app.tenant_id', true));
-- CREATE POLICY "tenant_msgs"     ON chat_messages     USING (tenant_id::text = current_setting('app.tenant_id', true));
-- CREATE POLICY "tenant_kb"       ON global_knowledge  USING (tenant_id::text = current_setting('app.tenant_id', true));
-- CREATE POLICY "tenant_mem"      ON agent_memories    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ── Verificación ─────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
