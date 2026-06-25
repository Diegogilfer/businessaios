# v0.9.5 — Automation, Scheduling & Analytics Guide

## 🔄 What's New in v0.9.5

### 1. Scheduled Arbitrage Scans
**Daily at 2 AM UTC**:
- Scans 5 categories (Electronics, Home, Sports, Fashion, Beauty)
- Records data for NeuroProfile learning
- Sends webhooks for opportunities >200% ROI

### 2. Intelligent Predictions
**Daily at 6 AM UTC**:
- NeuroProfile predicts best category for next scan
- Analyzes 7-day trends
- Confidence scoring

### 3. Webhook Notifications
```
POST /webhooks/register
{
  "event_type": "arbitrage.opportunities_found",
  "url": "https://your-service.com/arbitrage-webhook"
}
```

**Events available**:
- `arbitrage.opportunities_found` (high-ROI opportunities)
- `neuro.prediction` (next best category)
- `task.completed` (execution finished)
- `agent.finished` (agent execution done)

### 4. System Analytics
```
GET /analytics/health          → Overall system health score
GET /analytics/executions      → Execution statistics
GET /analytics/agents          → Per-agent performance
GET /analytics/knowledge       → Knowledge base growth
```

---

## 📋 Setup

### 1. Configure webhooks (optional)
```bash
curl -X POST http://localhost:8000/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "arbitrage.opportunities_found",
    "url": "https://your-webhook-url.com/arbitrage"
  }'
```

### 2. Start system
```bash
pip install -r requirements.txt
python main.py
```

### 3. Monitor scheduler
```bash
curl http://localhost:8000/scheduling/status
```

Output:
```json
{
  "running": true,
  "jobs": [
    {
      "id": "arbitrage_scan",
      "trigger": "cron[hour=2, minute=0]",
      "next_run": "2026-06-10 02:00:00"
    },
    {
      "id": "neuro_prediction",
      "trigger": "cron[hour=6, minute=0]",
      "next_run": "2026-06-10 06:00:00"
    }
  ]
}
```

---

## 🧠 NeuroProfile Predictions

**How it works**:
1. Each scan records: ROI, margin, opportunity count
2. 7-day trends analyzed
3. Consistency scoring
4. Best category predicted for next day

**Example**:
```json
{
  "prediction": "Electronics",
  "confidence": 0.92,
  "categories_tracked": 5
}
```

---

## 📊 Analytics Endpoints

### System Health
```bash
GET /analytics/health
```

Returns:
- Health score (0-100)
- Execution stats
- Agent performance
- Knowledge base growth

### Execution Stats
```bash
GET /analytics/executions?days=7
```

Returns:
- Total executions
- Success rate
- Average quality score

### Agent Performance
```bash
GET /analytics/agents
```

Returns per-agent metrics:
- Execution count
- Average quality
- Success rate

---

## 🔔 Webhook Examples

### Opportunity Webhook Payload
```json
{
  "event": "arbitrage.opportunities_found",
  "timestamp": "2026-06-10T02:15:00Z",
  "data": {
    "category": "Electronics",
    "count": 8,
    "best_roi": 427,
    "opportunities": [
      {
        "amazon": {"asin": "B09XYZ", "title": "Power Bank"},
        "supplier": {"price": 8.50},
        "financials": {"net_margin": 35.19, "roi_percent": 277}
      }
    ]
  }
}
```

### Prediction Webhook Payload
```json
{
  "event": "neuro.prediction",
  "timestamp": "2026-06-10T06:00:00Z",
  "data": {
    "prediction": {
      "prediction": "Electronics",
      "confidence": 0.92
    }
  }
}
```

---

## ⚙️ Configuration

### Timing
Edit `services/scheduling/scheduler.py`:
```python
# Change scan time
CronTrigger(hour=2, minute=0)  # 2 AM UTC

# Change prediction time
CronTrigger(hour=6, minute=0)  # 6 AM UTC
```

### Categories to Scan
Edit `services/scheduling/scheduler.py`:
```python
categories = ["Electronics", "Home", "Sports", "Fashion", "Beauty"]
```

### ROI Threshold for Webhooks
Edit the same file:
```python
if o["financials"]["roi_percent"] > 200:  # Change threshold
```

---

## 🚀 Next Steps

1. **Deploy to production** (Railway, AWS, etc.)
2. **Register webhooks** to your notification system
3. **Monitor /analytics/health** for system vitals
4. **Review /arbitrage/predict** for tomorrow's best categories
5. **Build dashboard** to visualize the data (FASE 7)

---

## Dashboard Integration (FASE 7)

Once you build dashboard, consume:
- `/analytics/health` → Health card
- `/analytics/agents` → Agent performance chart
- `/analytics/knowledge` → KB growth chart
- `/scheduling/status` → Next scheduled tasks
- WebSocket `/ws` → Live execution feed

All data is ready. Dashboard just visualizes it.
