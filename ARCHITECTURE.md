# BusinessAIOS v1.0.0 — Architecture for Developers

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (FASE 7)                        │
│         Next.js Dashboard consuming /dashboard/* APIs        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────────────────┐
│                  FastAPI Backend (v1.0.0)                   │
│                  (This system right here)                    │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ Autonomous  │  │    RAG +     │  │  Tool System   │    │
│  │ Loop        │◄─┤ Knowledge    │  │                │    │
│  │             │  │              │  │ - web_search   │    │
│  │ Think       │  │ - Embeddings │  │ - kb_search    │    │
│  │ Plan        │  │ - pgvector   │  │ - calculator   │    │
│  │ Execute     │  │ - Semantic   │  │ - scraper      │    │
│  │ Verify      │  │   search     │  │ - datetime     │    │
│  │ Learn       │  └──────────────┘  └────────────────┘    │
│  └──┬──────────┘                                           │
│     │                                                       │
│  ┌──▼──────────────────────────────────────────────────┐   │
│  │            Arbitrage Agent + NeuroProfile           │   │
│  │                                                      │   │
│  │  - Amazon SP-API connector                          │   │
│  │  - AliExpress API connector                         │   │
│  │  - Margin calculator                               │   │
│  │  - Risk scoring                                     │   │
│  │  - 7-day trend learning                            │   │
│  │  - Daily predictions                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │  Browser   │  │  Events &    │  │  Scheduling &  │     │
│  │ Automation │  │  WebSockets  │  │  Webhooks      │     │
│  │            │  │              │  │                │     │
│  │ Playwright │  │ EventBus     │  │ APScheduler    │     │
│  │ anti-bot   │  │ real-time    │  │ daily @ 2 AM   │     │
│  │            │  │              │  │ notifications  │     │
│  └────────────┘  └──────────────┘  └────────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Multi-Tenant SaaS Layer (FASE 11)             │   │
│  │                                                       │   │
│  │  - Tenant isolation (RLS ready)                      │   │
│  │  - API key authentication                          │   │
│  │  - Subscription management                         │   │
│  │  - Usage tracking + quotas                         │   │
│  │  - Billing integration (Stripe-ready)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Analytics Engine + Dashboard API                    │   │
│  │                                                       │   │
│  │  - System health scoring                            │   │
│  │  - Per-agent performance metrics                    │   │
│  │  - Knowledge base growth tracking                   │   │
│  │  - Execution statistics                            │   │
│  │  - All as JSON endpoints (no UI)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Queue System (async task processing)          │   │
│  │                                                       │   │
│  │  - Task queue with 3 concurrent workers              │   │
│  │  - Status tracking (queued/running/done)             │   │
│  │  - Automatic retry with exponential backoff          │   │
│  │  - Ready for ARQ/Celery migration                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Supabase (PostgreSQL + pgvector)               │
│                                                              │
│  Tables: tasks, executions, agents, knowledge, agents_mem  │
│          subscriptions, api_keys, tenants, neuro_profiles   │
│          arbitrage_opportunities, and more (17 total)       │
│                                                              │
│  Extensions: pgvector (768-dim embeddings)                  │
│  Indexes: IVF-FLAT for fast similarity search              │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Arbitrage Scan

```
User calls: POST /arbitrage/scan
│
├─► ArbitrageAgent.scan_category()
│   ├─► Amazon SP-API: Get best-sellers
│   ├─► AliExpress API: Find suppliers
│   ├─► MarginCalculator: Net profit = (price - cost - fees) × 0.85
│   ├─► RiskScorer: LOW/MEDIUM/HIGH
│   └─► Return: 50 opportunities sorted by ROI
│
├─► NeuroProfile.record_scan()
│   ├─► Save to neuro_profiles table
│   ├─► Analyze 7-day trends
│   └─► Update learning model
│
├─► WebhookService.send_webhook()
│   └─► If ROI > 200%: Fire notification to registered URLs
│
└─► Response: JSON with opportunities

Daily (2 AM UTC):
┌─► Scheduler.scheduled_arbitrage_scan()
│   ├─► Scans 5 categories
│   ├─► Records data
│   ├─► Sends webhooks
│   └─► Continues loop
│
└─► At 6 AM UTC: predict_next_best_category()
    └─► "Electronics has highest trend this week"
```

## Autonomous Loop Flow

```
Task arrives
│
├─► THINK PHASE
│   └─► Analyze: complexity, category, required agents
│
├─► PLAN PHASE
│   ├─► Single agent mode?
│   ├─► Collaboration mode (multiple agents)?
│   └─► Delegation mode (CEO splits task)?
│
├─► EXECUTE PHASE
│   ├─► Route to correct engine
│   └─► Agents process task
│
├─► TOOL INVOCATION (Inside execute)
│   ├─► Parse <tool name="..." />
│   ├─► Execute tool (web_search, kb_search, etc)
│   ├─► Return results to agent
│   └─► Agent refines output
│
├─► VERIFY PHASE
│   ├─► Quality scoring (0-1)
│   ├─► If score > 0.7: Pass to learn
│   └─► If score < 0.7: Retry (up to 3x)
│
└─► LEARN PHASE
    ├─► Save to memory
    ├─► Add to knowledge base
    ├─► Generate embeddings
    └─► Done!
```

## Key Services Breakdown

### services/autonomous/
- **autonomous_loop.py**: Full loop orchestration
- **think.py**: Task analysis
- **plan.py**: Strategy selection
- **execute.py**: Engine routing
- **verify.py**: Quality scoring
- **learn.py**: Memory + KB update

### services/rag/
- **embedding_service.py**: Gemini API
- **vector_search.py**: pgvector queries
- **rag_context.py**: Inject into prompts

### services/execution/
- **execution_engine.py**: Main processor + RAG

### services/ecommerce/
- **arbitrage/arbitrage_agent.py**: Core logic
- **arbitrage/neuro_profile.py**: Learning engine
- **amazon/sp_api_connector.py**: Amazon API
- **aliexpress/affiliate_api_connector.py**: AliExpress API

### services/saas/
- **tenant/tenant_manager.py**: Multi-tenant mgmt
- **billing/billing_engine.py**: Subscriptions
- **api_keys/api_key_manager.py**: Auth

### services/analytics/
- **analytics_engine.py**: Metrics aggregation

### services/scheduling/
- **scheduler.py**: APScheduler tasks

## Extending the System

### Add a new tool
1. Create function in `services/tools/tool_registry.py`
2. Register: `TOOLS = { "tool_name": tool_function }`
3. Parse in `tool_invocation.py` (already works)
4. Done!

### Add a new agent
1. Create class in `services/agents/`
2. Implement: `async def execute(task, context)`
3. Register in `agent_definitions.py`
4. Delegation engine auto-discovers

### Add a new scraper
1. Create in `services/scraping/scraper_tasks.py`
2. Use `BrowserExecutor` for automation
3. Register in task registry
4. Invoke via `/scraping/{scraper_name}`

### Add a new event
1. Define in `services/events/event_types.py`
2. Publish: `event_bus.publish(EventType.YOUR_EVENT, data)`
3. All WebSocket clients receive automatically

## Performance Considerations

- **RAG searches**: <500ms (pgvector IVF index)
- **Browser automation**: 8-12s first page, 3-5s subsequent
- **Arbitrage scans**: 2-5 min per category (rate-limited)
- **Autonomous loop cycle**: 10-30s depending on task
- **Concurrent tasks**: 3 (queue semaphore), can scale to 100+
- **WebSocket connections**: Unlimited per browser

## Security

- ✅ API key authentication (X-API-Key header)
- ✅ Tenant isolation (ready for RLS)
- ✅ Input validation (Pydantic)
- ✅ Rate limiting (configurable in tools)
- ✅ CORS configurable
- ✅ Env var secrets (never in code)

## Production Checklist

- [ ] All 17 database tables created
- [ ] Supabase pgvector extension enabled
- [ ] API credentials configured (.env)
- [ ] CORS domain set to frontend URL
- [ ] Scheduler running (check /scheduling/status)
- [ ] Browser automation working (check /docs)
- [ ] WebSocket connections working (test /ws)
- [ ] Webhooks registered (optional)
- [ ] Monitoring enabled (/analytics/health)
- [ ] Backups scheduled (Supabase auto-handles)

---

**This architecture scales to millions of users with proper infrastructure (load balancing, caching, database scaling).**
