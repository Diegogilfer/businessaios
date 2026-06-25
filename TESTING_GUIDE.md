# BusinessAIOS v1.0.0 — Testing & Validation Guide

## 🧪 Quick Validation (5 minutes)

Once you run `python main.py`, test these endpoints:

### 1. System Health
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", "version": "1.0.0", ...}
```

### 2. API Docs
```bash
open http://localhost:8000/docs
# Swagger UI with all 50+ endpoints
```

### 3. Root Info
```bash
curl http://localhost:8000/
# Returns system info + all features
```

---

## 🔐 SaaS Testing (10 minutes)

### Step 1: Create Tenant
```bash
curl -X POST http://localhost:8000/saas/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test@example.com",
    "plan": "starter"
  }'

# Response: {"tenant_id": "uuid-here", "status": "created"}
# Save tenant_id for next steps
export TENANT_ID="your-uuid"
```

### Step 2: Generate API Key
```bash
curl -X POST "http://localhost:8000/saas/api-keys?tenant_id=$TENANT_ID&name=TestKey"
# Response: {"key": "bios_xxxxx", "status": "active"}
export API_KEY="bios_xxxxx"
```

### Step 3: Get Subscription
```bash
curl "http://localhost:8000/saas/billing/$TENANT_ID" \
  -H "X-API-Key: $API_KEY"
# Shows plan limits
```

### Step 4: Test API Key Auth
```bash
curl http://localhost:8000/dashboard/overview \
  -H "X-API-Key: $API_KEY"
# Should return dashboard data
```

---

## 📊 Analytics Testing (5 minutes)

### System Health
```bash
curl "http://localhost:8000/analytics/health" \
  -H "X-API-Key: $API_KEY"
# Returns health score, agent performance, KB growth
```

### Execution Stats
```bash
curl "http://localhost:8000/analytics/executions?days=7" \
  -H "X-API-Key: $API_KEY"
# Shows success rate, avg quality, total executions
```

### Agent Performance
```bash
curl "http://localhost:8000/analytics/agents" \
  -H "X-API-Key: $API_KEY"
# Per-agent metrics
```

### Knowledge Growth
```bash
curl "http://localhost:8000/analytics/knowledge" \
  -H "X-API-Key: $API_KEY"
# KB growth tracking
```

---

## 🔄 Scheduler Testing

### Check Status
```bash
curl http://localhost:8000/scheduling/status
# Shows next run times for scans/predictions
```

Expected output:
```json
{
  "running": true,
  "jobs": [
    {
      "id": "arbitrage_scan",
      "trigger": "cron[hour=2, minute=0]",
      "next_run": "2026-06-11 02:00:00"
    },
    {
      "id": "neuro_prediction", 
      "trigger": "cron[hour=6, minute=0]",
      "next_run": "2026-06-11 06:00:00"
    }
  ]
}
```

---

## 🪝 Webhook Testing

### Register Webhook
```bash
curl -X POST http://localhost:8000/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "arbitrage.opportunities_found",
    "url": "http://localhost:8001/webhook"  # Your webhook endpoint
  }'
```

### List Available Events
```bash
curl http://localhost:8000/webhooks/events
# Shows all event types you can subscribe to
```

---

## 💡 Full Integration Test (30 minutes)

### 1. Setup
```bash
# Terminal 1: Start the system
cd BusinessAIOS_v080
python main.py

# Terminal 2: Create tenant + key
export TENANT_ID="..."
export API_KEY="bios_..."
```

### 2. Check System Ready
```bash
curl http://localhost:8000/health
# Should be "healthy"
```

### 3. Scan for Opportunities (if Amazon/AliExpress configured)
```bash
curl -X POST http://localhost:8000/arbitrage/scan \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Electronics",
    "subcategory": "Accessories",
    "limit": 5
  }'
```

### 4. Get Dashboard Data
```bash
curl http://localhost:8000/dashboard/overview \
  -H "X-API-Key: $API_KEY"

curl http://localhost:8000/dashboard/agent-performance \
  -H "X-API-Key: $API_KEY"

curl http://localhost:8000/dashboard/knowledge-growth \
  -H "X-API-Key: $API_KEY"
```

### 5. Test WebSocket (Real-time)
```bash
# Install websocat: npm i -g @aspecto/websocat
websocat ws://localhost:8000/ws

# You'll receive all system events in real-time
```

---

## ✅ Validation Checklist

- [ ] `/health` returns healthy
- [ ] `/docs` opens Swagger UI
- [ ] Can create tenant
- [ ] Can generate API key
- [ ] API key authentication works
- [ ] `/analytics/*` endpoints respond
- [ ] `/scheduling/status` shows jobs running
- [ ] Webhooks can be registered
- [ ] WebSocket connects
- [ ] Dashboard endpoints return JSON

**If all pass → System is ready for production**

---

## 🐛 Troubleshooting During Testing

### Port 8000 already in use
```bash
lsof -i :8000
kill -9 <PID>
python main.py
```

### Module import errors
```bash
pip install -r requirements.txt --force-reinstall
python main.py
```

### Supabase connection fails
```bash
# Check .env variables
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Test connection
psql $DATABASE_URL
```

### Scheduler not running
```bash
curl http://localhost:8000/scheduling/status
# Should show "running": true
```

### API returns 401 (Unauthorized)
```bash
# Make sure API_KEY is set
echo $API_KEY

# Use -H "X-API-Key: $API_KEY" in requests
```

---

## 📈 Performance Testing

### Measure Response Time
```bash
time curl http://localhost:8000/dashboard/overview \
  -H "X-API-Key: $API_KEY"
```

Expected: <500ms for dashboard endpoints

### Load Testing (optional)
```bash
# Install: pip install locust
cat > locustfile.py << 'EOF'
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def health_check(self):
        self.client.get("/health")
    
    @task
    def analytics(self):
        headers = {"X-API-Key": "bios_xxxxx"}
        self.client.get("/analytics/health", headers=headers)
EOF

locust -f locustfile.py -u 10 -r 1 -t 1m
```

---

## 🎓 Example: Create Customer + Get Data

```bash
#!/bin/bash
set -e

# 1. Create tenant
RESPONSE=$(curl -s -X POST http://localhost:8000/saas/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "plan": "professional"
  }')

TENANT_ID=$(echo $RESPONSE | grep -o '"tenant_id":"[^"]*' | cut -d'"' -f4)
echo "Created tenant: $TENANT_ID"

# 2. Generate API key
KEY_RESPONSE=$(curl -s -X POST "http://localhost:8000/saas/api-keys?tenant_id=$TENANT_ID&name=APIKey1")
API_KEY=$(echo $KEY_RESPONSE | grep -o '"key":"[^"]*' | cut -d'"' -f4)
echo "API Key: $API_KEY"

# 3. Get subscription
curl -s "http://localhost:8000/saas/billing/$TENANT_ID" \
  -H "X-API-Key: $API_KEY" | jq .

# 4. Get system health
curl -s "http://localhost:8000/analytics/health" \
  -H "X-API-Key: $API_KEY" | jq .

echo "✅ All tests passed!"
```

Save as `test_customer_flow.sh`, then:
```bash
chmod +x test_customer_flow.sh
./test_customer_flow.sh
```

---

## 📊 Monitoring Dashboard (Simple HTML)

Create `dashboard.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>BusinessAIOS Monitor</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #fff; padding: 20px; }
        .card { background: #2d2d2d; padding: 20px; margin: 10px 0; border-radius: 5px; }
        .healthy { color: #4ec9b0; }
        .degraded { color: #ce9178; }
        h1 { color: #569cd6; }
    </style>
</head>
<body>
    <h1>🚀 BusinessAIOS Monitor</h1>
    <div id="health" class="card">Loading...</div>
    <div id="analytics" class="card">Loading...</div>
    <div id="scheduler" class="card">Loading...</div>

    <script>
        const API_KEY = "bios_YOUR_KEY_HERE";
        
        async function updateDashboard() {
            try {
                // Health
                const health = await fetch("http://localhost:8000/health").then(r => r.json());
                document.getElementById("health").innerHTML = `
                    <h2>Health</h2>
                    <p>Status: <span class="${health.status === 'healthy' ? 'healthy' : 'degraded'}">${health.status}</span></p>
                    <p>Version: ${health.version}</p>
                    <p>Services: Database ${health.services.database}, Scheduler ${health.services.scheduler}</p>
                `;
                
                // Analytics
                const analytics = await fetch(`http://localhost:8000/analytics/health`, {
                    headers: { "X-API-Key": API_KEY }
                }).then(r => r.json());
                document.getElementById("analytics").innerHTML = `
                    <h2>Analytics</h2>
                    <p>Health Score: ${analytics.health_score}/100</p>
                `;
                
                // Scheduler
                const scheduler = await fetch("http://localhost:8000/scheduling/status").then(r => r.json());
                document.getElementById("scheduler").innerHTML = `
                    <h2>Scheduler</h2>
                    <p>Status: ${scheduler.running ? '✅ RUNNING' : '❌ STOPPED'}</p>
                    <p>Next Scan: ${scheduler.jobs[0]?.next_run || 'N/A'}</p>
                `;
            } catch(e) {
                document.body.innerHTML = `<h1>❌ Connection failed</h1><p>${e.message}</p>`;
            }
        }
        
        updateDashboard();
        setInterval(updateDashboard, 5000);
    </script>
</body>
</html>
```

Open in browser: `file:///path/to/dashboard.html`

---

**Everything tests green? You're production-ready.**

