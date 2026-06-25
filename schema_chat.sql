-- ============================================================
-- BusinessAIOS - schema_chat.sql
-- FASE 7.5: Tablas para chat conversacional con agentes
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema principal
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_role  TEXT        NOT NULL
                    CHECK (agent_role IN ('ceo','research','commercial','content','finance','operations','hr')),
    agent_name  TEXT        NOT NULL,
    title       TEXT        DEFAULT '',
    tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role             TEXT        NOT NULL CHECK (role IN ('user','assistant')),
    content          TEXT        NOT NULL,
    agent_role       TEXT        DEFAULT '',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_agent      ON conversations(agent_role);
CREATE INDEX IF NOT EXISTS idx_conv_updated    ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_msgs_conv       ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msgs_created    ON chat_messages(created_at ASC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC: últimas N conversaciones con el último mensaje
CREATE OR REPLACE FUNCTION get_recent_conversations(p_limit int DEFAULT 20)
RETURNS TABLE (
    id          UUID,
    agent_role  TEXT,
    agent_name  TEXT,
    title       TEXT,
    last_msg    TEXT,
    msg_count   BIGINT,
    updated_at  TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
    SELECT
        c.id, c.agent_role, c.agent_name, c.title,
        (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS msg_count,
        c.updated_at
    FROM conversations c
    ORDER BY c.updated_at DESC
    LIMIT p_limit;
$$;

-- ============================================================
-- Blueprint 2026-2028: Tabla de auditoría transparente
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type  TEXT        NOT NULL,
    agent_role  TEXT        NOT NULL,
    action      TEXT        NOT NULL,
    data        JSONB       DEFAULT '{}',
    tenant_id   TEXT        DEFAULT 'default',
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_agent     ON audit_log(agent_role);
CREATE INDEX IF NOT EXISTS idx_audit_event     ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_tenant    ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
