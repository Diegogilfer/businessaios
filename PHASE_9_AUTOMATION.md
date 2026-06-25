# FASE 9+ — Browser Automation & Web Scraping

## Overview

BusinessAIOS now includes **browser automation** with **Playwright** for autonomous web scraping tasks. This enables the Finance Agent (and any agent) to:

- Scrape live financial data from Yahoo Finance
- Extract structured information from any web page
- Bypass anti-bot measures with intelligent recovery
- Integrate scraped data into task execution and learning

---

## Architecture

```
Autonomous Loop

┌─ Agent executes task
│
├─► Detects: <tool name="scrape_yahoo_finance" ticker="AAPL" />
│
├─► Tool Invocation
│   └─ Calls: scraper_registry.execute(ScraperTask)
│
├─► Browser Automation
│   ├─ Navigate to Yahoo Finance
│   ├─ Verify page status (consent gate? hydration? rate limit?)
│   ├─ Handle recovery (accept consent, wait for DOM, retry)
│   ├─ Click quarterly/annual toggle
│   ├─ Expand rows (Total Revenue, Operating Expense, etc)
│   └─ Extract financial table
│
├─► Results injected back to agent
│   └─ Agent refines analysis with real financial data
│
└─ Result saved to memory + KB with embeddings
```

---

## Yahoo Finance Implementation

Based on `yahoo_finance_architecture_report.md`:

### What We Handle

✅ **Consent gate** (EU/UK)
- Detects `guce.yahoo.com` redirect
- Automatically accepts consent form
- Persists cookies

✅ **Lazy hydration**
- Waits for `div.tableBody div.row` to render
- Handles SPA hydration delays up to 15s

✅ **Dynamic CSS class evasion**
- Never anchors on `yf-<hash>` classes
- Uses stable selectors:
  - `#tab-quarterly`, `#tab-annual` (IDs)
  - `aria-label="Total Revenue"` (aria attributes)
  - `data-cpos`, `data-symbol` (data attributes)
  - Structural classes: `row`, `column`, `tableBody`, `lv-0/1/2`

✅ **Rate limiting (HTTP 999)**
- Detects rate limit response
- Triggers proxy rotation + exponential backoff
- Returns `{"status": "rate_limited", "retry_after_seconds": 60}`

✅ **Layout shifts + expander clicks**
- Uses `scroll_into_view_if_needed()` before clicks
- Retry logic with exponential backoff (0.5s, 1s, 2s)
- Detects `aria-expanded` state

✅ **Web component hydration**
- Handles `<fin-streamer>` shadow DOM
- Waits for text content availability

### Usage Example

```python
# From agent code (inside autonomous loop)
<tool name="scrape_yahoo_finance" ticker="AAPL" view="quarterly" />

# System executes:
result = await yahoo_scraper.scrape_financials(
    ticker="AAPL",
    view="quarterly",
    expand_rows=["Total Revenue", "Operating Expense"]
)

# Returns:
{
    "status": "ok",
    "ticker": "AAPL",
    "view": "quarterly",
    "data": {
        "headers": ["TTM", "Q1 2026", "Q4 2025", "Q3 2025", ...],
        "rows": [
            {
                "depth": "0",
                "label": "Total Revenue",
                "cells": ["119.6B", "119.8B", "115.0B", ...]
            },
            {
                "depth": "1",
                "label": "Services",
                "cells": ["23.1B", "22.3B", ...]
            },
            ...
        ]
    }
}

# Agent receives this data and refines output:
# "Based on the latest Q1 2026 financials (revenue: $119.8B),
#  here's my updated financial analysis..."
```

### API Endpoints

**POST /scraping/yahoo-finance**
```json
{
    "ticker": "AAPL",
    "view": "quarterly",
    "expand_rows": ["Total Revenue", "Operating Expense"]
}
```

**GET /scraping/scrapers**
- Lists all available scrapers and their capabilities

**POST /scraping/execute**
- Generic scraper executor (flexible but requires more params)

**GET /scraping/status**
- Check if browser automation system is ready

---

## Tool Invocation Example

Agent code in autonomous loop:

```
Analyzing stock performance for AAPL:
<tool name="scrape_yahoo_finance" ticker="AAPL" view="quarterly" />

[System returns latest financials]

Based on the Q1 2026 revenue of $119.8B (+4% vs Q1 2025),
and considering the Services segment at $23.1B (+8% YoY),
my recommendation is:
- Growth trajectory is strong in high-margin services
- Total revenue expansion of 4% is modest but stable
- Operating margin pressure evident in cost trends

Rating: HOLD with positive outlook
Target price implications: +15% upside to $250/share
```

---

## Recovery Strategies (Implemented)

| Failure Mode | Detection | Recovery |
|---|---|---|
| Consent gate | `page.url` contains `guce.yahoo.com` | POST consent form, reload |
| Incomplete hydration | `div.tableBody div.row` count < 5 | Wait up to 15s |
| Rate limit (999) | HTTP status 999 or "unusual traffic" text | Rotate proxy, exponential backoff |
| Layout shift on expand | New `div.row.lv-1` children appear | Re-query table after wait |
| Bot challenge | `<body>` contains "verify you are human" | Return `blocked` status |
| Web component lag | `fin-streamer` text empty | Wait for `shadowRoot` or text content |

---

## Future Scrapers (Stubs Ready)

- **Shopify** — Extract products, pricing, reviews
- **Amazon** — Scrape ASIN data, reviews, pricing
- **Generic Table** — Extract any HTML table from URL

---

## Configuration

Add to `.env` (optional for proxy rotation):

```
PROXY_ROTATION_ENABLED=true
PROXY_LIST=http://proxy1:8080,http://proxy2:8080
```

Without proxy rotation, rate limits will be hit on aggressive scraping. For production, integrate with rotating proxy service.

---

## Performance Notes

- **First scrape**: 8-12 seconds (browser launch + navigation + hydration + extraction)
- **Subsequent scrapes**: 3-5 seconds (browser reuse)
- **Memory**: ~150MB per browser instance
- **Concurrency**: Can run 3-5 browser instances in parallel (configurable)

---

## Security Considerations

- **User Agent rotation** — Already implemented
- **Cookie persistence** — Handled (consent cookies, session cookies)
- **Rate limit respect** — Exponential backoff implemented
- **No captcha solving** — Hard blocks on hCaptcha/reCAPTCHA (returns `blocked`)
- **Terms of Service** — Scraping Yahoo Finance is allowed for personal use; commercial use requires API access

---

## Integration with Autonomous Loop

When Finance Agent encounters a task requiring financial analysis:

1. **Think phase**: Recognizes "financial analysis" category
2. **Plan phase**: Routes to Finance Agent (+ optionally Research)
3. **Execute phase**: Finance Agent invokes `<tool name="scrape_yahoo_finance" />`
4. **Tool results**: Injected back into agent prompt
5. **Refinement**: Agent produces informed output using real data
6. **Learn phase**: Scraped + analyzed data → Knowledge Base with embedding

Result: **Agents that actually know current market conditions**, not just trained knowledge.

---

## What This Enables

- ✅ Real-time financial analysis
- ✅ Competitive pricing intelligence (Shopify/Amazon future)
- ✅ Market research with live data
- ✅ Automated reporting with current numbers
- ✅ SaaS customers get live data feeds → high-value product

---

## Next Steps

1. **Shopify integration** — Product intelligence
2. **Amazon integration** — Competitor monitoring
3. **Generic scraper** — Customer-defined data extraction
4. **Batch scraping** — Multiple tickers/URLs in parallel
5. **Scheduling** — Periodic scrapes (e.g., daily financials)
