-- ============================================================
-- BusinessAIOS - schema_fase12.sql
-- FASE 12: NeuroIA — tablas de predicción y copilot
-- Ejecutar DESPUÉS del schema_fase11.sql
-- ============================================================

-- Tabla de predicciones históricas (para comparar vs real)
CREATE TABLE IF NOT EXISTS quality_predictions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_role      TEXT        NOT NULL,
    category        TEXT        DEFAULT 'general',
    predicted_score NUMERIC(4,3),
    actual_score    NUMERIC(4,3),
    confidence      NUMERIC(4,3),
    trend           TEXT,
    tenant_id       TEXT        DEFAULT 'default',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pred_agent   ON quality_predictions(agent_role);
CREATE INDEX IF NOT EXISTS idx_pred_created ON quality_predictions(created_at DESC);

-- Tabla de briefings generados por el Copilot
CREATE TABLE IF NOT EXISTS copilot_briefings (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    type        TEXT        NOT NULL DEFAULT 'daily_briefing',
    briefing    TEXT        NOT NULL,
    metrics     JSONB       DEFAULT '{}',
    tenant_id   TEXT        DEFAULT 'default',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_briefings_created ON copilot_briefings(created_at DESC);

-- Tabla de alertas activas del sistema
CREATE TABLE IF NOT EXISTS system_alerts (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity    TEXT        NOT NULL CHECK (severity IN ('high','medium','low','info')),
    type        TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    action      TEXT,
    resolved    BOOLEAN     DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    tenant_id   TEXT        DEFAULT 'default',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON system_alerts(resolved);

-- Vista materializada: performance por agente y categoría (para predicciones rápidas)
CREATE OR REPLACE VIEW agent_performance_view AS
SELECT
    e.agent_used                            AS agent_role,
    t.category,
    COUNT(*)                                AS total_executions,
    AVG(e.quality_score)                    AS avg_quality,
    STDDEV(e.quality_score)                 AS std_quality,
    AVG(e.execution_time_seconds)           AS avg_time,
    COUNT(*) FILTER (WHERE e.status = 'completed') * 100.0 / NULLIF(COUNT(*), 0) AS success_rate
FROM executions e
JOIN tasks t ON t.id = e.task_id
WHERE e.agent_used IS NOT NULL
GROUP BY e.agent_used, t.category;

-- RPC: predicción rápida desde SQL (sin llamar al LLM)
CREATE OR REPLACE FUNCTION predict_agent_quality(
    p_agent_role TEXT,
    p_category   TEXT DEFAULT 'general'
)
RETURNS TABLE (
    agent_role       TEXT,
    predicted_quality NUMERIC,
    sample_size      BIGINT,
    trend            TEXT
) LANGUAGE sql STABLE AS $$
    SELECT
        agent_role,
        ROUND(AVG(avg_quality)::NUMERIC, 3) AS predicted_quality,
        SUM(total_executions)               AS sample_size,
        CASE
            WHEN AVG(avg_quality) >= 0.85 THEN 'improving'
            WHEN AVG(avg_quality) >= 0.65 THEN 'stable'
            ELSE 'declining'
        END AS trend
    FROM agent_performance_view
    WHERE agent_role = p_agent_role
    GROUP BY agent_role;
$$;

-- Tabla de reportes de auto-aprendizaje
CREATE TABLE IF NOT EXISTS learning_reports (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    report      JSONB       NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_learning_created ON learning_reports(created_at DESC);

-- ── Tabla de skills instalados por tenant ────────────────────
CREATE TABLE IF NOT EXISTS installed_skills (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    TEXT        NOT NULL DEFAULT 'default',
    skill_name   TEXT        NOT NULL,
    active       BOOLEAN     DEFAULT TRUE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, skill_name)
);
CREATE INDEX IF NOT EXISTS idx_skills_tenant ON installed_skills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_skills_active ON installed_skills(active);

-- ── Tabla de reportes de optimización automática ─────────────
CREATE TABLE IF NOT EXISTS optimization_reports (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    report      JSONB       NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_optreports_created ON optimization_reports(created_at DESC);
