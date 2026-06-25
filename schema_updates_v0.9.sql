-- ============================================================
-- BusinessAIOS v0.9 — Schema updates for Arbitrage + NeuroIA
-- ============================================================

-- NeuroProfile table (learning from arbitrage scans)
CREATE TABLE IF NOT EXISTS neuro_profiles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category      TEXT NOT NULL,
    scan_timestamp TIMESTAMPTZ NOT NULL,
    total_opportunities INTEGER DEFAULT 0,
    avg_roi       NUMERIC(8,2) DEFAULT 0,
    avg_margin    NUMERIC(8,2) DEFAULT 0,
    high_risk_count INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast category queries
CREATE INDEX IF NOT EXISTS idx_neuro_category ON neuro_profiles(category);
CREATE INDEX IF NOT EXISTS idx_neuro_timestamp ON neuro_profiles(scan_timestamp DESC);

-- Arbitrage opportunities (cache of scans)
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id               TEXT NOT NULL,
    amazon_asin           TEXT NOT NULL,
    amazon_price          NUMERIC(8,2),
    aliexpress_product_id TEXT,
    supplier_price        NUMERIC(8,2),
    shipping_cost         NUMERIC(8,2),
    net_margin            NUMERIC(8,2),
    roi_percent           NUMERIC(8,2),
    risk_level            TEXT,
    viable                BOOLEAN DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_asin ON arbitrage_opportunities(amazon_asin);
CREATE INDEX IF NOT EXISTS idx_opportunities_roi ON arbitrage_opportunities(roi_percent DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_viable ON arbitrage_opportunities(viable);
