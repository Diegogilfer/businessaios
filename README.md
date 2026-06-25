# BusinessAIOS v0.8.1

> **Autonomous Business Intelligence OS** — Multi-Agent AI with WebSocket, task queue, autonomous loop, **RAG** + semantic search, and **tool invocation**.

---

## What's New in v0.8.1

✅ **FASE 8 — RAG + Semantic Search**
- Supabase `pgvector` integration for vector similarity
- Gemini embeddings API for semantic encoding
- Hybrid search: category + semantic relevance
- Agents receive context by meaning, not just category

✅ **Tool Invocation System**
- Agents call tools during execution: `<tool name="web_search" query="..." />`
- Real web search (SerpAPI / Tavily / stub)
- Knowledge base search with semantic similarity
- Calculator, datetime, and extensible registry

---

## Architecture

```
Client (HTTP / WebSocket)
         │
    FastAPI v0.8.1
         │
    ┌────┴─────────────────────────────────────┐
    │ Execution  Autonomous Loop  Queue Worker │
    └────┬─────────────────────────────────────┘
         │
    EventBus ──► WebSocket Manager ──► Live clients
         │
    ┌────┴──────────────────────┐
    │ Agents + Tool Invocation  │
    │ (web_search, calc, kb)    │
    └────┬──────────────────────┘
         │
    ┌────┴──────────────────────────────────────┐
    │ RAG (Semantic Search)  Knowledge Base     │
    │ Embeddings (pgvector)                    │
    └────┬──────────────────────────────────────┘
         │
      Supabase (PostgreSQL + pgvector)
```

---

## Quick Start

### 1. Enable pgvector in Supabase
Go to SQL editor and run:
```sql
CREATE EXTENSION IF NOT EXISTS "vector";
```

### 2. Configure environment
```bash
cp .env.example .env
# Set: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY
# Optional: SERP_API_KEY or TAVILY_API_KEY for real web search
```

### 3. Install & run
```bash
pip install -r requirements.txt
# Run schema.sql in Supabase SQL editor
python main.py
```

### 4. Open docs
```
http://localhost:8000/docs
```

---

## Key Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/tasks/execute` | POST | Execute with collaboration |
| `/queue/enqueue` | POST | Queue for async execution |
| `/autonomous/run` | POST | Full Think→Plan→Execute→Verify→Learn loop with tools |
| `/rag/search/semantic` | POST | Search knowledge by semantic similarity |
| `/rag/search/hybrid` | POST | Category + semantic search |
| `/rag/embed` | POST | Generate embedding for text |
| `/ws/{task_id}` | WS | Real-time event stream |
| `/metrics` | GET | Execution statistics |
| `/metrics/events` | GET | Event history |

---

## Autonomous Loop with Tools

```
Think (analyze task)
 ↓
Plan (decide strategy)
 ↓
Execute (run agents)
 ├─ Agent may invoke tools:
 │  ├─ <tool name="web_search" query="..." />
 │  ├─ <tool name="knowledge_search" query="..." />
 │  └─ <tool name="calculator" expression="..." />
 └─ Tools return results
 ↓
Verify (check quality)
 ↓
Learn (save memory + knowledge + embeddings)
 ↓
[Retry if needed]
```

---

## RAG Workflow

1. **Knowledge saved** → automatically generates Gemini embedding
2. **Query arrives** → agent gets semantic context injected
3. **Agent invokes** `<tool name="knowledge_search" query="..." />`
4. **pgvector searches** for similar entries (cosine distance)
5. **Results fed back** to agent for refinement

---

## Phases Complete

| Phase | Feature | Status |
|---|---|---|
| 1–5.2 | Infrastructure → Delegation | ✅ |
| 6.1–6.3 | Events → WebSocket → Queue | ✅ |
| 9 | Autonomous Loop + Tools | ✅ |
| **8** | **RAG + Embeddings + pgvector** | **✅ NEW** |
| 7 | Dashboard (Next.js) | 🔜 |
| 10 | SaaS multi-tenant | 🔜 |

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Service or anon key |
| `SERP_API_KEY` | ⬜ | For Google search via SerpAPI |
| `TAVILY_API_KEY` | ⬜ | For Tavily AI search |
| `APP_ENV` | ⬜ | development / production |

---

## What Makes v0.8.1 Special

- **RAG**: Agents learn by semantic meaning, not just categories
- **Tools**: Real autonomy — agents search, calculate, research live
- **Quality Loop**: Think→Plan→Execute→(Refine with tools)→Verify→Learn
- **Event-Driven**: Every action broadcasts to WebSocket clients
- **Task Queue**: Background execution prevents timeouts
- **Scalable**: Ready for SaaS multi-tenant (Fase 10)

---

## Next: Dashboard (Fase 7)

The autonomy layer is complete. Fase 7 will add a React/Next.js dashboard to:
- Visualize agent execution in real-time
- View knowledge base growth
- Monitor task queue
- Analytics on execution quality
- Agent performance metrics
