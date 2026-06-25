# BusinessAIOS v1.0.0 — Quick Reference (Copy-Paste Commands)

## 🚀 Start Here

```bash
# 1. Clone & enter
cd BusinessAIOS_v080

# 2. Setup (auto-installs everything)
bash setup.sh

# 3. Configure credentials
nano .env  # or vim, or your editor

# 4. Start server
python main.py

# 5. Open in browser
open http://localhost:8000/docs
```

---

## 📡 API Calls (Testing)

### Health Check
```bash
curl http://localhost:8000/health
```

### Create Tenant (SaaS)
```bash
curl -X POST http://localhost:8000/saas/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "plan": "starter"
  }'
# Response: {"tenant_id": "uuid", "status": "created"}
```

### Generate API Key
```bash
TENANT_ID="uuid-from-above"
curl -X POST "http://localhost:8000/saas/api-keys?tenant_id=$TENANT_ID&name=MyKey"
# Response: {"key": "bios_xxxxx", "status": "active"}

# Save API_KEY for next requests:
export API_KEY="bios_xxxxx"
```

### Scan for Arbitrage Opportunities
```bash
curl -X POST http://localhost:8000/arbitrage/scan \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Electronics",
    "subcategory": "Accessories",
    "limit": 20
  }'
```

### Predict Best Category
```bash
curl http://localhost:8000/arbitrage/predict \
  -H "X-API-Key: $API_KEY"
```

### Dashboard Overview
```bash
curl http://localhost:8000/dashboard/overview \
  -H "X-API-Key: $API_KEY"
```

### System Health
```bash
curl http://localhost:8000/analytics/health \
  -H "X-API-Key: $API_KEY"
```

### Scheduler Status
```bash
curl http://localhost:8000/scheduling/status
```

### Register Webhook
```bash
curl -X POST http://localhost:8000/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "arbitrage.opportunities_found",
    "url": "https://your-webhook.com/arbitrage"
  }'
```

### List Webhook Events
```bash
curl http://localhost:8000/webhooks/events
```

### Execute Task (Autonomous Loop)
```bash
curl -X POST http://localhost:8000/tasks/execute \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Find ways to increase sales",
    "context": "E-commerce store, $50k/month revenue"
  }'
```

---

## 🐳 Docker

### Build
```bash
docker build -t businessaios .
```

### Run Locally
```bash
docker run -p 8000:8000 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_KEY=$SUPABASE_KEY \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  businessaios
```

### Docker Compose
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 🚢 Deploy (5 minutes)

### Railway
```bash
npm i -g @railway/cli
railway init
railway add
railway variables  # Set your env vars
railway up
```

### Heroku
```bash
heroku create my-businessaios-app
heroku config:set SUPABASE_URL=$SUPABASE_URL
heroku config:set SUPABASE_KEY=$SUPABASE_KEY
heroku config:set GEMINI_API_KEY=$GEMINI_API_KEY
git push heroku main
```

### AWS Lambda
1. Create function (Python 3.12)
2. Upload ZIP with `/home/claude/BusinessAIOS_v080`
3. Set environment variables
4. Handler: `main.app`
5. Done!

---

## 🧪 Testing

### Run Tests
```bash
pytest tests/
pytest -v  # Verbose
pytest --cov  # Coverage
```

### Test Autonomous Loop
```bash
curl -X POST http://localhost:8000/autonomous/run \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Analyze our sales data",
    "max_retries": 3
  }'
```

### Test WebSocket
```bash
# In one terminal:
python main.py

# In another:
websocat ws://localhost:8000/ws
# You'll receive all events in real-time
```

---

## 📊 Monitoring

### View Logs
```bash
tail -f app.log  # If logging to file
docker logs -f businessaios  # If in Docker
```

### Check Queue Status
```bash
curl http://localhost:8000/queue/status
```

### Agent Performance
```bash
curl http://localhost:8000/analytics/agents
```

### Knowledge Base Growth
```bash
curl http://localhost:8000/analytics/knowledge
```

---

## 🔧 Configuration

### Change Scheduler Times
Edit `services/scheduling/scheduler.py`:
```python
CronTrigger(hour=2, minute=0)  # Change 2 to any hour (UTC)
```

### Change Queue Workers
Edit `services/queue/task_queue.py`:
```python
self.semaphore = asyncio.Semaphore(3)  # Change 3 to more/less workers
```

### Add New Tool
Edit `services/tools/tool_registry.py`:
```python
TOOLS = {
    "my_tool": my_tool_function,
    # ... existing tools
}
```

### Change Log Level
In .env:
```
LOG_LEVEL=DEBUG  # For verbose logging
```

---

## 🚨 Troubleshooting

### Port Already In Use
```bash
lsof -i :8000
kill -9 <PID>
python main.py
```

### Module Not Found
```bash
pip install -r requirements.txt --force-reinstall
```

### Database Connection Failed
```bash
# Check .env variables
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Test connection
psql $DATABASE_URL
```

### Scheduler Not Running
```bash
curl http://localhost:8000/scheduling/status
# Should show "running": true
```

### WebSocket Connection Refused
```bash
# Check CORS in main.py
# Make sure frontend domain is in allow_origins
```

---

## 📱 Environment Variables Checklist

```
✅ SUPABASE_URL
✅ SUPABASE_KEY
✅ GEMINI_API_KEY
⭐ AMAZON_CLIENT_ID (for arbitrage)
⭐ AMAZON_CLIENT_SECRET (for arbitrage)
⭐ AMAZON_REFRESH_TOKEN (for arbitrage)
⭐ ALIEXPRESS_APP_KEY (for arbitrage)
⭐ ALIEXPRESS_APP_SECRET (for arbitrage)
⚪ STRIPE_SECRET_KEY (for billing)
⚪ SENDGRID_API_KEY (for email)

✅ = Required to start
⭐ = Required for arbitrage scanning
⚪ = Optional (billing/email features)
```

---

## 💾 Backup Database

```bash
# Supabase (automatic, but manual backup):
pg_dump $DATABASE_URL > backup.sql

# Restore:
psql $DATABASE_URL < backup.sql
```

---

## 🎓 Learn More

- API Docs: `/docs` (Swagger UI)
- Architecture: `ARCHITECTURE.md`
- Monetization: `MONETIZATION.md`
- Automation: `AUTOMATION_GUIDE.md`
- Arbitrage: `ARBITRAGE.md`
- Deployment: `DEPLOYMENT_GUIDE.md`

---

**Everything you need. Copy-paste ready. 🚀**
