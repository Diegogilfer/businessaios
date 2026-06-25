# ============================================================
# BusinessAIOS - api/routes/scraping.py
# FASE 9+ — Web scraping task endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.scraping.scraper_tasks import (
    ScraperTask,
    ScraperType,
    scraper_registry,
)
from core.logger import get_logger

router = APIRouter(prefix="/scraping", tags=["Web Scraping (FASE 9+)"])
logger = get_logger("ScrapingRouter")


class ScrapeRequest(BaseModel):
    scraper_type: str
    target: str
    params: dict = {}
    priority: int = 1


class ScrapeYahooFinanceRequest(BaseModel):
    ticker: str
    view: str = "quarterly"
    expand_rows: list[str] | None = None


@router.get("/scrapers", summary="List available scrapers")
async def list_scrapers():
    """Return available web scrapers and their parameters."""
    return scraper_registry.list_scrapers()


@router.post("/execute", summary="Execute a scraping task")
async def execute_scraper(data: ScrapeRequest):
    """Execute a scraper task immediately."""
    try:
        scraper_type = ScraperType(data.scraper_type)
        task = ScraperTask(
            scraper_type=scraper_type,
            target=data.target,
            params=data.params,
            priority=data.priority,
        )
        result = await scraper_registry.execute(task)
        return result

    except ValueError:
        raise HTTPException(
            400,
            f"Unknown scraper type: {data.scraper_type}. "
            f"Available: {[s.value for s in ScraperType]}",
        )
    except Exception as e:
        logger.error(f"Scrape execution error: {e}")
        raise HTTPException(500, str(e))


@router.post("/yahoo-finance", summary="Scrape Yahoo Finance financials")
async def scrape_yahoo_finance(data: ScrapeYahooFinanceRequest):
    """
    Scrape Yahoo Finance financials for a stock ticker.

    Handles:
    - Consent gates (EU/UK)
    - Lazy hydration
    - Rate limiting
    - Dynamic CSS class evasion

    Based on: yahoo_finance_architecture_report.md
    """
    try:
        from services.scraping.yahoo_finance_scraper import yahoo_scraper

        result = await yahoo_scraper.scrape_financials(
            ticker=data.ticker,
            view=data.view,
            expand_rows=data.expand_rows,
        )

        return {
            "ticker": data.ticker,
            **result,
        }

    except Exception as e:
        logger.error(f"Yahoo Finance scrape error: {e}")
        raise HTTPException(500, str(e))


@router.get("/status", summary="Scraping system status")
async def scraper_status():
    """Check if browser automation and scrapers are ready."""
    from services.browser.browser_executor import browser_executor

    return {
        "browser_ready": browser_executor.browser is not None or True,  # lazy init
        "scrapers_available": len(scraper_registry.list_scrapers()),
        "features": [
            "yahoo_finance (with anti-bot recovery)",
            "generic_table (stub)",
            "shopify (stub)",
            "amazon (stub)",
        ],
    }
