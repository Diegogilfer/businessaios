# FASE 10+ — Cross-Border Arbitrage Intelligence System

## Overview

BusinessAIOS includes an **autonomous arbitrage agent** that:
- Scans Amazon best-sellers in real-time
- Matches with AliExpress suppliers
- Calculates net margins (accounting for Amazon fees)
- Predicts high-ROI categories using NeuroProfile learning
- Returns opportunities ranked by profitability

**Example**: Found 47 opportunities in Electronics Accessories:
- Best ROI: 427% ($89 margin)
- Average ROI: 185%
- Average Net Margin: $24.50

---

## Setup

### 1. Get API Credentials

**Amazon SP-API**
- Portal: https://developer-docs.amazon.com/sp-api/
- Get: `client_id`, `client_secret`, `refresh_token`
- Approval: 1-3 days

**AliExpress Affiliate**
- Portal: https://portals.aliexpress.com
- Get: `app_key`, `app_secret`
- Approval: Instant

### 2. Configure .env

```env
# Amazon
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REFRESH_TOKEN=your_refresh_token

# AliExpress
ALIEXPRESS_APP_KEY=your_app_key
ALIEXPRESS_APP_SECRET=your_app_secret
```

### 3. Run Schema Updates

```sql
-- In Supabase SQL editor, run:
-- Copy contents of schema_updates_v0.9.sql
```

---

## API Endpoints

### POST /arbitrage/scan
Scan a category for arbitrage opportunities.

```json
{
  "category": "Electronics",
  "subcategory": "Accessories",
  "limit": 20
}
```

**Response**:
```json
{
  "scan_timestamp": "2026-06-09T...",
  "category": "Electronics",
  "total_opportunities": 47,
  "opportunities": [
    {
      "amazon": {
        "asin": "B09XYZ1234",
        "title": "Magnetic Wireless Power Bank",
        "price": 45.99
      },
      "supplier": {
        "platform": "AliExpress",
        "base_price": 8.50,
        "shipping_days": 15,
        "supplier_rating": 97.2
      },
      "financials": {
        "total_cost": 10.80,
        "net_margin": 29.91,
        "roi_percent": 277.0
      },
      "risk": {
        "level": "LOW",
        "warnings": []
      }
    }
  ]
}
```

### GET /arbitrage/predict
Predict best category for tomorrow.

**Response**:
```json
{
  "timestamp": "...",
  "prediction": {
    "prediction": "Electronics",
    "confidence": 0.92,
    "categories_tracked": 5
  }
}
```

### GET /arbitrage/insights/{category}
Get 7-day trend for a category.

---

## Margin Calculation

```
Net Margin = (Amazon Price - Supplier Price - Shipping) × 0.85

Fee Factor 0.85 accounts for:
- Amazon seller fees (~12%)
- FBA fees (~5%)
- Taxes (~2%)
- Contingency (~1%)
```

**Example**:
```
Amazon price:       $45.99
Supplier price:     -$8.50
Shipping:           -$2.30
                    -------
Gross margin:       $35.19
Fee factor 0.85:    ×0.85
Net margin:         $29.91
ROI:                277% ($29.91 / $10.80)
```

Minimum viable margin: **$15.00 USD**

---

## Risk Assessment

| Level | Criteria |
|-------|----------|
| LOW | Rating ≥95%, shipping ≤30d, net margin ≥$20 |
| MEDIUM | Rating 90-95%, shipping 30-45d, net margin $15-20 |
| HIGH | Rating <90%, shipping >45d, or net margin <$15 |

**Automatic filtering**: Only returns viable opportunities (LOW/MEDIUM).

---

## NeuroProfile Learning

Each scan is recorded and analyzed:

1. **Pattern Detection** — Which categories trend up/down
2. **Seasonality** — Winter vs summer opportunities
3. **Supplier Reliability** — Which suppliers deliver consistently
4. **Prediction** — Suggest best category for next scan

Data persisted in `neuro_profiles` table (7+ scans = good predictions).

---

## Integration with Autonomous Loop

Finance Agent can invoke:
```
<tool name="scan_arbitrage" category="Electronics" />

System returns top 5 opportunities, agent analyzes and recommends.
```

---

## Scale to Production

For high-volume scanning:
1. Enable async batch processing (`/queue/enqueue`)
2. Schedule daily scans at 2 AM UTC
3. Webhook notifications when opportunities >200% ROI found
4. Integrate with Shopify/WooCommerce for auto-listing

---

## Disclaimer

- This system respects all APIs' Terms of Service
- No scraping, only official APIs
- Arbitrage is legal but requires business compliance
- User responsible for taxes, shipping, returns, disputes
