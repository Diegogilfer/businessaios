#!/bin/bash
# BusinessAIOS v1.0.0 — API Usage Examples
# Copy-paste these commands directly

set -e

echo "🚀 BusinessAIOS API Examples"
echo "============================"
echo ""

# ── Setup ──────────────────────────────────────────────────
echo "STEP 1: Create Tenant"
TENANT=$(curl -s -X POST http://localhost:8000/saas/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Corp",
    "email": "admin@example.com",
    "plan": "starter"
  }')

TENANT_ID=$(echo $TENANT | jq -r '.tenant_id')
echo "✅ Tenant created: $TENANT_ID"
echo ""

# ── API Key ────────────────────────────────────────────────
echo "STEP 2: Generate API Key"
KEY=$(curl -s -X POST "http://localhost:8000/saas/api-keys?tenant_id=$TENANT_ID&name=ExampleKey")
API_KEY=$(echo $KEY | jq -r '.key')
echo "✅ API Key: $API_KEY"
echo ""

# ── Health ─────────────────────────────────────────────────
echo "STEP 3: Check System Health"
curl -s http://localhost:8000/health | jq '.'
echo ""

# ── Analytics ──────────────────────────────────────────────
echo "STEP 4: Get System Analytics"
curl -s "http://localhost:8000/analytics/health" \
  -H "X-API-Key: $API_KEY" | jq '.health_score'
echo ""

# ── Dashboard ──────────────────────────────────────────────
echo "STEP 5: Get Dashboard Data"
curl -s "http://localhost:8000/dashboard/overview" \
  -H "X-API-Key: $API_KEY" | jq '.'
echo ""

# ── Scheduler ──────────────────────────────────────────────
echo "STEP 6: Check Scheduler Status"
curl -s http://localhost:8000/scheduling/status | jq '.jobs'
echo ""

# ── Webhooks ───────────────────────────────────────────────
echo "STEP 7: Register Webhook (optional)"
echo "Run this to get alerts when opportunities found:"
echo "curl -X POST http://localhost:8000/webhooks/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"event_type\": \"arbitrage.opportunities_found\", \"url\": \"YOUR_WEBHOOK_URL\"}'"
echo ""

# ── Arbitrage (if configured) ──────────────────────────────
echo "STEP 8: Scan for Opportunities (requires Amazon/AliExpress API keys)"
echo "curl -X POST http://localhost:8000/arbitrage/scan \\"
echo "  -H 'X-API-Key: $API_KEY' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"category\": \"Electronics\", \"limit\": 5}'"
echo ""

echo "✅ All basic tests passed!"
echo "📚 For more examples, see QUICK_REFERENCE.md"
