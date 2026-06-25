# ============================================================
# BusinessAIOS - services/scraping/scraper_tasks.py
# FASE 9+ — Scraper task definitions and registry
# ============================================================

from enum import Enum
from core.logger import get_logger

logger = get_logger("ScraperTasks")


class ScraperType(str, Enum):
    YAHOO_FINANCE = "yahoo_finance"
    SHOPIFY = "shopify"
    AMAZON = "amazon"
    GENERIC_TABLE = "generic_table"


class ScraperTask:
    """Represents a scraping task to be executed."""

    def __init__(
        self,
        scraper_type: ScraperType,
        target: str,
        params: dict,
        priority: int = 1,
    ):
        self.scraper_type = scraper_type
        self.target = target  # ticker, shop URL, product URL, etc
        self.params = params  # scraper-specific params
        self.priority = priority


class ScraperRegistry:
    """Registry of available scrapers and their capabilities."""

    def __init__(self):
        self.scrapers = {
            ScraperType.YAHOO_FINANCE: {
                "description": "Yahoo Finance financial statements",
                "params": ["ticker", "view", "expand_rows"],
                "supports_retry": True,
                "anti_bot_handling": True,
            },
            ScraperType.SHOPIFY: {
                "description": "Shopify store products and pricing",
                "params": ["shop_url", "page", "filter"],
                "supports_retry": True,
                "anti_bot_handling": False,
            },
            ScraperType.AMAZON: {
                "description": "Amazon product data (ASIN)",
                "params": ["asin", "locale"],
                "supports_retry": True,
                "anti_bot_handling": True,
            },
            ScraperType.GENERIC_TABLE: {
                "description": "Extract tables from any URL",
                "params": ["url", "table_selector", "wait_for"],
                "supports_retry": True,
                "anti_bot_handling": False,
            },
        }

    def get_scraper_info(self, scraper_type: ScraperType) -> dict | None:
        return self.scrapers.get(scraper_type)

    def list_scrapers(self) -> list[dict]:
        return [
            {
                "type": st.value,
                **info,
            }
            for st, info in self.scrapers.items()
        ]

    async def execute(self, task: ScraperTask) -> dict:
        """Route task to appropriate scraper."""
        logger.info(
            f"Executing scraper task | type={task.scraper_type} "
            f"target={task.target}"
        )

        if task.scraper_type == ScraperType.YAHOO_FINANCE:
            from services.scraping.yahoo_finance_scraper import yahoo_scraper
            return await yahoo_scraper.scrape_financials(
                ticker=task.target,
                view=task.params.get("view", "quarterly"),
                expand_rows=task.params.get("expand_rows"),
            )

        # Stub implementations for future scrapers
        elif task.scraper_type == ScraperType.SHOPIFY:
            logger.warning("Shopify scraper not yet implemented")
            return {"status": "not_implemented", "scraper": "shopify"}

        elif task.scraper_type == ScraperType.AMAZON:
            logger.warning("Amazon scraper not yet implemented")
            return {"status": "not_implemented", "scraper": "amazon"}

        elif task.scraper_type == ScraperType.GENERIC_TABLE:
            logger.warning("Generic table scraper not yet implemented")
            return {"status": "not_implemented", "scraper": "generic_table"}

        else:
            return {"status": "error", "reason": f"Unknown scraper: {task.scraper_type}"}


scraper_registry = ScraperRegistry()
