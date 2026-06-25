-- ============================================================
-- BusinessAIOS v1.0.0 — Schema Maestro Completo para Supabase
-- ============================================================
-- CÓMO USARLO:
--   1. Abre tu proyecto Supabase → SQL Editor
--   2. Pega todo este archivo y presiona RUN
--   3. Orden de ejecución es correcto (sin errores de FK)
--   4. Seeds son idempotentes (ON CONFLICT DO NOTHING)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";   -- RAG / pgvector


-- ────────────────────────────────────────────────────────────
-- FUNCIÓN GLOBAL: auto updated_at
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- BLOQUE 1 — CORE: Proyectos, Agentes, Tareas, Ejecuciones
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT        NOT NULL,
    description   TEXT,
    industry      TEXT,
    target_market TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Los 6 agentes especializados del sistema
CREATE TABLE IF NOT EXISTS agents (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    role        TEXT        NOT NULL
                    CHECK (role IN (
                        'ceo','research','commercial',
                        'content','finance','operations','hr'
                    )),
    goal        TEXT,
    personality TEXT,                          -- system_prompt personalizado
    project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed')),
    priority    INTEGER     DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    category    TEXT        DEFAULT 'general'
                    CHECK (category IN (
                        'market_research','sales','content',
                        'strategy','finance','operations','general'
                    )),
    result      TEXT,                          -- respuesta final del agente
    project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
    agent_id    UUID        REFERENCES agents(id)   ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Log de auditoría de cada ejecución (Think→Plan→Execute→Verify→Learn)
CREATE TABLE IF NOT EXISTS executions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id                UUID         REFERENCES tasks(id) ON DELETE CASCADE,
    agent_used             TEXT,                    -- rol del agente ejecutor
    collaboration_used     BOOLEAN      DEFAULT FALSE,
    agents_contributed     TEXT[]       DEFAULT '{}', -- roles que colaboraron
    quality_score          NUMERIC(4,2) DEFAULT 0,
    execution_time_seconds NUMERIC(8,2) DEFAULT 0,
    status                 TEXT         DEFAULT 'completed'
                               CHECK (status IN ('completed','failed','partial')),
    error                  TEXT,
    created_at             TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- BLOQUE 2 — MEMORIA Y CONOCIMIENTO (Aprendizaje continuo)
-- ============================================================

-- Memoria episódica por agente (resultados previos)
CREATE TABLE IF NOT EXISTS agent_memories (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id       UUID         REFERENCES tasks(id) ON DELETE SET NULL,
    agent_id      TEXT,                       -- nombre del rol (no UUID)
    result        TEXT,
    objective     TEXT,
    category      TEXT         DEFAULT 'general',
    quality_score NUMERIC(4,2) DEFAULT 0,
    success       BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Base de conocimiento global generada por los agentes
CREATE TABLE IF NOT EXISTS global_knowledge (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title        TEXT        NOT NULL,
    content      TEXT        NOT NULL,
    category     TEXT        NOT NULL DEFAULT 'general'
                     CHECK (category IN (
                         'market_research','sales','content',
                         'strategy','finance','operations','general'
                     )),
    source_agent TEXT,                        -- qué agente generó este conocimiento
    tags         TEXT[]      DEFAULT '{}',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings para RAG / búsqueda semántica (pgvector)
-- vector(768) = Gemini text-embedding-004
-- Si migras a DeepSeek embeddings: cambia a vector(1024)
CREATE TABLE IF NOT EXISTS embeddings (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_id UUID        REFERENCES global_knowledge(id) ON DELETE CASCADE,
    text_preview TEXT,
    embedding    vector(768),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- BLOQUE 3 — ARBITRAGE ENGINE (Amazon ↔ AliExpress)
-- ============================================================

-- Oportunidades detectadas por ArbitrageAgent
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id               TEXT         NOT NULL,      -- UUID del batch de scan
    amazon_asin           TEXT         NOT NULL,
    amazon_price          NUMERIC(8,2),
    aliexpress_product_id TEXT,
    supplier_price        NUMERIC(8,2),
    shipping_cost         NUMERIC(8,2) DEFAULT 1.50,
    net_margin            NUMERIC(8,2),
    roi_percent           NUMERIC(8,2),
    risk_level            TEXT         CHECK (risk_level IN ('low','medium','high')),
    viable                BOOLEAN      DEFAULT FALSE,
    category              TEXT,                       -- Electronics, Home, etc.
    created_at            TIMESTAMPTZ  DEFAULT NOW()
);

-- Perfiles de aprendizaje del motor NeuroIA
-- Registra patrones por categoría para predecir mejores scans
CREATE TABLE IF NOT EXISTS neuro_profiles (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    category            TEXT         NOT NULL,
    scan_timestamp      TIMESTAMPTZ  NOT NULL,
    total_opportunities INTEGER      DEFAULT 0,
    avg_roi             NUMERIC(8,2) DEFAULT 0,
    avg_margin          NUMERIC(8,2) DEFAULT 0,
    high_risk_count     INTEGER      DEFAULT 0,
    created_at          TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- BLOQUE 4 — WEBHOOKS (notificaciones en tiempo real)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    url        TEXT        NOT NULL,
    events     TEXT[]      DEFAULT '{}',   -- ["arbitrage.found","task.completed"]
    secret     TEXT,                        -- HMAC signing secret
    active     BOOLEAN     DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id     UUID         REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event           TEXT         NOT NULL,
    payload         JSONB,
    status_code     INTEGER,
    success         BOOLEAN      DEFAULT FALSE,
    attempt_count   INTEGER      DEFAULT 1,
    delivered_at    TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- BLOQUE 5 — SCHEDULER (tareas programadas)
-- ============================================================

-- Registro de ejecuciones programadas (APScheduler audit trail)
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id       TEXT         NOT NULL,   -- "arbitrage_scan", "neuro_prediction"
    status       TEXT         DEFAULT 'completed'
                     CHECK (status IN ('completed','failed','skipped')),
    run_at       TIMESTAMPTZ  DEFAULT NOW(),
    duration_ms  INTEGER,
    result       JSONB,
    error        TEXT
);


-- ============================================================
-- BLOQUE 6 — MULTI-TENANT / SaaS (FASE 11)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT        NOT NULL,
    email      TEXT        UNIQUE NOT NULL,
    plan       TEXT        DEFAULT 'free'
                   CHECK (plan IN ('free','starter','pro','enterprise')),
    status     TEXT        DEFAULT 'active'
                   CHECK (status IN ('active','suspended','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    key        TEXT        UNIQUE NOT NULL,
    tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       TEXT,
    status     TEXT        DEFAULT 'active' CHECK (status IN ('active','revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan              TEXT         NOT NULL,
    status            TEXT         DEFAULT 'active'
                          CHECK (status IN ('active','past_due','cancelled')),
    start_date        TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    amount            NUMERIC(8,2),
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- Columnas multi-tenant en tablas principales
ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE executions       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE global_knowledge ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE agent_memories   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);


-- ============================================================
-- ÍNDICES — performance en queries frecuentes
-- ============================================================

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project     ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent       ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category    ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant      ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created     ON tasks(created_at DESC);

-- executions
CREATE INDEX IF NOT EXISTS idx_executions_task   ON executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_tenant ON executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_executions_date   ON executions(created_at DESC);

-- agent_memories
CREATE INDEX IF NOT EXISTS idx_memories_agent    ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_task     ON agent_memories(task_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON agent_memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_success  ON agent_memories(success);

-- global_knowledge
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON global_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_agent    ON global_knowledge(source_agent);
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant   ON global_knowledge(tenant_id);

-- embeddings (IVFFlat coseno — óptimo para RAG)
CREATE INDEX IF NOT EXISTS idx_embeddings_knowledge ON embeddings(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
    ON embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- arbitrage
CREATE INDEX IF NOT EXISTS idx_arb_asin    ON arbitrage_opportunities(amazon_asin);
CREATE INDEX IF NOT EXISTS idx_arb_roi     ON arbitrage_opportunities(roi_percent DESC);
CREATE INDEX IF NOT EXISTS idx_arb_viable  ON arbitrage_opportunities(viable);
CREATE INDEX IF NOT EXISTS idx_arb_scan    ON arbitrage_opportunities(scan_id);
CREATE INDEX IF NOT EXISTS idx_arb_cat     ON arbitrage_opportunities(category);

-- neuro_profiles
CREATE INDEX IF NOT EXISTS idx_neuro_category  ON neuro_profiles(category);
CREATE INDEX IF NOT EXISTS idx_neuro_timestamp ON neuro_profiles(scan_timestamp DESC);

-- webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_endpoint  ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event     ON webhook_deliveries(event);
CREATE INDEX IF NOT EXISTS idx_webhooks_success   ON webhook_deliveries(success);

-- scheduler
CREATE INDEX IF NOT EXISTS idx_jobs_id     ON scheduled_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_run    ON scheduled_jobs(run_at DESC);

-- SaaS
CREATE INDEX IF NOT EXISTS idx_api_keys_key         ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status  ON tasks(tenant_id, status);


-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS tasks_updated_at    ON tasks;
DROP TRIGGER IF EXISTS projects_updated_at ON projects;

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- RPCs — Búsqueda semántica (RAG)
-- ============================================================

-- Búsqueda vectorial pura por similitud coseno
CREATE OR REPLACE FUNCTION vector_search_knowledge(
    query_embedding  vector,
    match_threshold  float8,
    match_count      int
)
RETURNS TABLE (
    id         UUID,
    title      TEXT,
    content    TEXT,
    category   TEXT,
    similarity float8
) LANGUAGE sql STABLE AS $$
    SELECT
        gk.id, gk.title, gk.content, gk.category,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    JOIN global_knowledge gk ON e.knowledge_id = gk.id
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Búsqueda híbrida: filtro por categoría + semántica
CREATE OR REPLACE FUNCTION hybrid_search_knowledge(
    query_embedding  vector,
    query_category   text,
    match_count      int
)
RETURNS TABLE (
    id         UUID,
    title      TEXT,
    content    TEXT,
    category   TEXT,
    similarity float8
) LANGUAGE sql STABLE AS $$
    SELECT
        gk.id, gk.title, gk.content, gk.category,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    JOIN global_knowledge gk ON e.knowledge_id = gk.id
    WHERE gk.category = query_category
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Dashboard: métricas agregadas en una sola query
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'total_tasks',           (SELECT COUNT(*)                      FROM tasks),
        'completed_tasks',       (SELECT COUNT(*) FROM tasks           WHERE status = 'completed'),
        'failed_tasks',          (SELECT COUNT(*) FROM tasks           WHERE status = 'failed'),
        'running_tasks',         (SELECT COUNT(*) FROM tasks           WHERE status = 'running'),
        'total_executions',      (SELECT COUNT(*)                      FROM executions),
        'avg_quality_score',     (SELECT ROUND(AVG(quality_score)::numeric, 2) FROM executions),
        'total_knowledge',       (SELECT COUNT(*)                      FROM global_knowledge),
        'total_memories',        (SELECT COUNT(*)                      FROM agent_memories),
        'viable_opportunities',  (SELECT COUNT(*) FROM arbitrage_opportunities WHERE viable = TRUE),
        'active_webhooks',       (SELECT COUNT(*) FROM webhook_endpoints       WHERE active  = TRUE),
        'total_tenants',         (SELECT COUNT(*)                      FROM tenants)
    );
$$;

-- Analytics: tasa de éxito por agente (para /dashboard/agent-performance)
CREATE OR REPLACE FUNCTION get_agent_performance_stats()
RETURNS TABLE (
    agent_id      TEXT,
    total_tasks   BIGINT,
    completed     BIGINT,
    failed        BIGINT,
    avg_quality   NUMERIC,
    success_rate  NUMERIC
) LANGUAGE sql STABLE AS $$
    SELECT
        e.agent_used                                   AS agent_id,
        COUNT(*)                                       AS total_tasks,
        COUNT(*) FILTER (WHERE e.status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE e.status = 'failed')    AS failed,
        ROUND(AVG(e.quality_score)::numeric, 2)        AS avg_quality,
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE e.status = 'completed') / NULLIF(COUNT(*), 0),
            1
        )                                              AS success_rate
    FROM executions e
    WHERE e.agent_used IS NOT NULL
    GROUP BY e.agent_used
    ORDER BY avg_quality DESC;
$$;


-- ============================================================
-- SEED DATA — Agentes base del sistema
-- ============================================================
INSERT INTO agents (name, role, goal) VALUES
    ('CEO Agent',        'ceo',        'Manage business strategy and consolidate team intelligence'),
    ('Research Agent',   'research',   'Analyze markets, competitors and opportunities'),
    ('Commercial Agent', 'commercial', 'Capture, qualify and convert leads'),
    ('Content Agent',    'content',    'Generate marketing and educational content'),
    ('Finance Agent',    'finance',    'Model financial projections and investment requirements'),
    ('Operations Agent', 'operations', 'Design operational processes and execution roadmaps')
ON CONFLICT DO NOTHING;


-- ============================================================
-- ROW LEVEL SECURITY — Activar cuando implementes Supabase Auth
-- ============================================================
-- Descomenta cuando actives autenticación real de usuarios:

-- ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents               ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE executions           ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_memories       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE global_knowledge     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE arbitrage_opportunities ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "tenant_isolation_tasks" ON tasks
--     USING (tenant_id = auth.uid()::uuid);
-- CREATE POLICY "tenant_isolation_knowledge" ON global_knowledge
--     USING (tenant_id = auth.uid()::uuid);


-- ============================================================
-- VERIFICACIÓN FINAL — Ejecuta esto después para confirmar
-- ============================================================
-- SELECT table_name,
--        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

