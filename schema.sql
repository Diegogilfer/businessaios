-- ============================================================
-- BusinessAIOS v0.8.1 — Supabase Schema with RAG support
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    description   TEXT,
    industry      TEXT,
    target_market TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,
    goal        TEXT,
    personality TEXT,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed')),
    priority    INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    category    TEXT DEFAULT 'general',
    result      TEXT,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    agent_id    UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Executions (audit log)
CREATE TABLE IF NOT EXISTS executions (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id                UUID REFERENCES tasks(id) ON DELETE CASCADE,
    agent_used             TEXT,
    collaboration_used     BOOLEAN DEFAULT FALSE,
    agents_contributed     TEXT[],
    quality_score          NUMERIC(4,2) DEFAULT 0,
    execution_time_seconds NUMERIC(8,2) DEFAULT 0,
    status                 TEXT DEFAULT 'completed',
    error                  TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memories
CREATE TABLE IF NOT EXISTS agent_memories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id       UUID REFERENCES tasks(id) ON DELETE SET NULL,
    agent_id      TEXT,
    result        TEXT,
    objective     TEXT,
    category      TEXT DEFAULT 'general',
    quality_score NUMERIC(4,2) DEFAULT 0,
    success       BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Global Knowledge (FASE 4)
CREATE TABLE IF NOT EXISTS global_knowledge (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    category     TEXT NOT NULL DEFAULT 'general',
    source_agent TEXT,
    tags         TEXT[] DEFAULT '{}',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings (FASE 8) — pgvector for semantic search
-- gemini-embedding-2-flash produce vectores de 3072 dims (GA 2025)
CREATE TABLE IF NOT EXISTS embeddings (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_id UUID REFERENCES global_knowledge(id) ON DELETE CASCADE,
    text_preview TEXT,
    embedding    vector(3072),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project      ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category     ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_memories_agent     ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_task      ON agent_memories(task_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON global_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_executions_task    ON executions(task_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_knowledge ON embeddings(knowledge_id);
-- ivfflat para cosine similarity (hnsw también válido para datasets grandes)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector  ON embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at    BEFORE UPDATE ON tasks    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vector search RPC (for semantic search)
CREATE OR REPLACE FUNCTION vector_search_knowledge(
    query_embedding vector,
    match_threshold float8,
    match_count int
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    similarity float8
) LANGUAGE sql STABLE AS $$
    SELECT
        gk.id,
        gk.title,
        gk.content,
        gk.category,
        1 - (e.embedding <=> query_embedding) as similarity
    FROM embeddings e
    JOIN global_knowledge gk ON e.knowledge_id = gk.id
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Hybrid search RPC (category + semantic)
CREATE OR REPLACE FUNCTION hybrid_search_knowledge(
    query_embedding vector,
    query_category text,
    match_count int
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    similarity float8
) LANGUAGE sql STABLE AS $$
    SELECT
        gk.id,
        gk.title,
        gk.content,
        gk.category,
        1 - (e.embedding <=> query_embedding) as similarity
    FROM embeddings e
    JOIN global_knowledge gk ON e.knowledge_id = gk.id
    WHERE gk.category = query_category
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Seed agents
INSERT INTO agents (name, role, goal) VALUES
    ('CEO Agent',        'ceo',        'Manage business strategy and consolidate team intelligence'),
    ('Research Agent',   'research',   'Analyze markets, competitors and opportunities'),
    ('Commercial Agent', 'commercial', 'Capture, qualify and convert leads'),
    ('Content Agent',    'content',    'Generate marketing and educational content'),
    ('Finance Agent',    'finance',    'Model financial projections and investment requirements'),
    ('Operations Agent', 'operations', 'Design operational processes and execution roadmaps')
ON CONFLICT DO NOTHING;
