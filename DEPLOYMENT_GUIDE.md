# BusinessAIOS v0.9.5+ — Deployment Guide

## 🚀 Quick Start (5 minutes)

### 1. Local Development
```bash
git clone <repo>
cd BusinessAIOS_v080
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your credentials

python main.py
# Visit http://localhost:8000/docs
```

### 2. Production Deployment (Railway, Heroku, AWS)

#### Railway (Recommended)
```bash
railway init
railway add
railway variables
# Set: SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY
railway up
```

#### Docker
```bash
docker build -t businessaios .
docker run -p 8000:8000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_KEY=... \
  businessaios
```

#### AWS Lambda
- Create Lambda function (Python 3.12)
- Layer: requirements.txt dependencies
- Handler: main.app
- Environment variables: Set all from .env

## 📊 Database Setup

### 1. Supabase
- Create project at supabase.io
- Copy URL + API key to .env
- Run SQL:
```sql
-- Core schema
\i schema.sql

-- SaaS schema
\i schema_saas.sql

-- Updates
\i schema_updates_v0.9.sql
```

### 2. Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 🔑 API Credentials

### Amazon SP-API
1. Go to developer-docs.amazon.com/sp-api/
2. Register seller account
3. Get: client_id, client_secret, refresh_token
4. Add to .env

### AliExpress Affiliate
1. Go to portals.aliexpress.com
2. Register as affiliate
3. Get: app_key, app_secret
4. Add to .env

### Gemini API
1. Go to makersuite.google.com
2. Create API key
3. Add to .env as GEMINI_API_KEY

## 🔄 Scheduled Tasks

Once deployed, tasks run automatically:
- **2 AM UTC**: Arbitrage scans
- **6 AM UTC**: NeuroProfile predictions

Monitor: `GET /scheduling/status`

## 📦 SaaS Multi-Tenant

### Create Tenant
```bash
curl -X POST http://localhost:8000/saas/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "plan": "starter"
  }'
# Returns: tenant_id, subscription
```

### Get API Key
```bash
curl -X POST "http://localhost:8000/saas/api-keys?tenant_id=UUID&name=MyKey"
# Returns: bios_XXX (save this securely!)
```

### Use API Key
```bash
curl -H "X-API-Key: bios_XXX" \
  http://localhost:8000/arbitrage/scan
```

## 📊 Monitor System

### Health Check
```bash
curl http://localhost:8000/health
```

### Metrics
```bash
curl http://localhost:8000/analytics/health
curl http://localhost:8000/analytics/agents
curl http://localhost:8000/analytics/knowledge
```

### Dashboard Data
```bash
curl http://localhost:8000/dashboard/overview
curl http://localhost:8000/dashboard/agent-performance
curl http://localhost:8000/dashboard/knowledge-growth
```

## 🪝 Webhooks (Optional)

Register webhook:
```bash
curl -X POST http://localhost:8000/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "arbitrage.opportunities_found",
    "url": "https://your-webhook-url.com/arbitrage"
  }'
```

## 💾 Backups

### Daily Database Backup
```bash
# Supabase handles this automatically

# Manual backup:
pg_dump <database_url> > backup.sql
```

## 🔐 Security Checklist

- ✅ API keys rotated monthly
- ✅ .env never committed to git
- ✅ HTTPS enforced
- ✅ CORS configured for frontend domain
- ✅ Rate limiting enabled (/tools/tool_registry.py)
- ✅ Request validation (Pydantic models)

## 📈 Scaling to 1000+ Users

1. **Database**: Supabase handles this, upgrade plan if needed
2. **API Server**: Deploy on Railway/AWS with auto-scaling
3. **Browser Automation**: Use Playwright Grid for concurrency
4. **Task Queue**: Switch from in-process to ARQ (Redis-backed)
5. **Cache**: Add Redis for API responses

## 🆘 Troubleshooting

### Scheduler not running
```
Check: /scheduling/status
Fix: Restart application
```

### WebSocket connection fails
```
Check: CORS settings in main.py
Fix: Add frontend domain to allow_origins
```

### Gemini API rate limit
```
Add backoff in: services/providers/gemini_provider.py
```

## 📚 Next Steps

1. Deploy this version (v0.9.5) to production
2. Build frontend dashboard (consumes /dashboard/* endpoints)
3. Add Stripe integration (billing_engine.py stub)
4. Launch beta with early customers

---

**BusinessAIOS is production-ready. Deploy now.**
