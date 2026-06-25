# Changes in BusinessAIOS v0.8.1

## Summary
Implemented **FASE 8 (RAG + Embeddings)** and **Tool Invocation System** for true autonomous execution.

---

## New Services

### services/rag/
- **embedding_service.py** — Generate + store Gemini embeddings (768-dim vectors)
- **vector_search.py** — Semantic search using pgvector cosine similarity
- **rag_context.py** — Inject semantic context into agent prompts

### services/search/
- **web_search.py** — Real web search (SerpAPI / Tavily / stub fallback)

### services/tools/
- **tool_invocation.py** — Extract & execute tool calls from agent output
  - Format: `<tool name="web_search" query="..." />`
  - Refine output with tool results

---

## Enhanced Services

### services/autonomous/autonomous_loop.py
- Tool invocation integrated into main loop
- Agents now refine output based on tool results
- Tracks tool calls per cycle
- Max 3 tool calls per cycle (configurable)

### services/execution/execution_engine.py
- RAG context injected for both single-agent and collaborative modes
- Embeddings auto-generated for high-quality results
- Agents receive semantic knowledge context

### services/tools/tool_registry.py
- Added real tools:
  - `web_search` — Search the web
  - `knowledge_search` — Semantic KB search
  - `calculator` — Math expressions
  - `datetime` — Current time
- Extensible for custom tools

---

## New API Routes

### POST /rag/search/semantic
Search knowledge base by semantic similarity.
```json
{
  "query": "increase sales revenue",
  "limit": 5,
  "threshold": 0.6
}
```

### POST /rag/search/hybrid
Category + semantic search.
```json
{
  "query": "competitor analysis",
  "category": "market_research",
  "limit": 5
}
```

### POST /rag/embed
Generate embedding for arbitrary text.

### GET /rag/status
Check if RAG system is ready.

---

## Database Schema Updates

### New Table: embeddings
- Links to global_knowledge entries
- Stores 768-dim vectors from Gemini
- IVF-FLAT index for fast similarity search
- Cosine distance metric

### New RPCs
- `vector_search_knowledge()` — Semantic search
- `hybrid_search_knowledge()` — Hybrid search with category filter

---

## Requirements
- `google-generativeai` (already present)
- `httpx>=0.27.2` (for async web search)
- pgvector extension enabled in Supabase

---

## Configuration

Add optional search API keys to `.env`:
```
SERP_API_KEY=...      # For Google search
TAVILY_API_KEY=...    # For Tavily AI search
```

Without these, web_search returns stub results. Real search requires one API key.

---

## How It Works

### Scenario: Autonomous Loop Executes Task

1. **Think Phase**: Analyze task → determine complexity, agents, strategy
2. **Plan Phase**: Create execution plan
3. **Execute Phase**: Run agents
4. **Tool Detection**: Check agent output for `<tool name="..." />`
5. **Tool Invocation**: Execute tools, gather results
6. **Refinement**: Re-prompt agent with tool results
7. **Verify Phase**: Check quality (now with tool context)
8. **Learn Phase**: Save memory + embeddings for future use

### RAG Injection Example
- Agent executes task about "sales funnels"
- RAG retrieves 3 similar past knowledge entries using vector similarity
- Agent receives semantic context: customer journey frameworks, conversion tactics
- Agent produces informed output with prior domain knowledge

---

## Backward Compatibility
✅ All changes are additive. Existing code paths work unchanged.
- Old Knowledge Base search still works (category-based)
- Agents without tool invocation still execute normally
- Embeddings generated async, don't block execution

---

## Next Steps (Fase 7)
- Executive Dashboard (Next.js + ShadCN)
- Real-time visualization of agent execution
- Knowledge base analytics
- Embedding quality monitoring

Fase 10 (SaaS):
- Multi-tenant architecture
- Stripe billing integration
- Custom tool registration per tenant
