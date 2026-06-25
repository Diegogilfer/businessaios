# ============================================================
# BusinessAIOS - services/browser/browser_executor.py
# FASE 9+ — Browser automation with Playwright
# Anti-bot recovery, retry logic from Yahoo Finance report
# ============================================================

import asyncio
import time
from enum import Enum
from core.logger import get_logger

logger = get_logger("BrowserExecutor")


class PageStatus(Enum):
    OK = "ok"
    CONSENT_REQUIRED = "consent_required"
    BOT_CHALLENGE = "bot_challenge"
    SHELL_ONLY = "shell_only"
    HYDRATION_INCOMPLETE = "hydration_incomplete"
    STREAM_NOT_BOUND = "stream_not_bound"
    RATE_LIMITED = "rate_limited"


class BrowserExecutor:
    """
    Manages browser automation with Playwright.
    Implements recovery strategies from anti-bot measures.

    Based on Yahoo Finance architecture report:
    - Consent gate handling (guce.yahoo.com)
    - Lazy hydration detection + wait
    - Dynamic CSS class detection (never anchor on yf-* hashes)
    - Rate limit recovery (999 code, rotate proxy/UA)
    - Web component shadow DOM handling
    """

    def __init__(self):
        self.browser = None
        self.context = None
        logger.info("BrowserExecutor initialized (browser not yet launched)")

    async def launch(self, headless: bool = True, proxy: str | None = None):
        """Launch browser instance."""
        try:
            from playwright.async_api import async_playwright
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=headless,
                proxy={"server": proxy} if proxy else None,
            )
            self.context = await self.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            logger.info("Browser launched successfully")
            return True
        except Exception as e:
            logger.error(f"Browser launch failed: {e}")
            return False

    async def close(self):
        """Clean shutdown."""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Browser close error: {e}")

    async def verify_page(self, page, ticker: str | None = None) -> PageStatus:
        """
        Post-load verification — detect blocking conditions.
        Based on yahoo_finance_architecture_report.md failure modes.
        """
        try:
            # Check for consent gate
            if "consent.yahoo.com" in page.url or "guce.yahoo.com" in page.url:
                return PageStatus.CONSENT_REQUIRED

            # Check for bot challenge
            if await page.locator('text=verify you are human').count() > 0:
                return PageStatus.BOT_CHALLENGE

            # Check for rate limit (HTTP 999)
            if page.status == 999 or "unusual traffic" in await page.content():
                return PageStatus.RATE_LIMITED

            # Check for shell (no hydration)
            if await page.locator("div.tableContainer").count() == 0:
                return PageStatus.SHELL_ONLY

            # Check for incomplete hydration
            if await page.locator("div.tableBody div.row").count() < 5:
                return PageStatus.HYDRATION_INCOMPLETE

            # For finance pages, check for streamer binding
            if ticker and await page.locator(f'fin-streamer[data-symbol="{ticker}"]').count() == 0:
                return PageStatus.STREAM_NOT_BOUND

            return PageStatus.OK

        except Exception as e:
            logger.error(f"Page verification error: {e}")
            return PageStatus.SHELL_ONLY

    async def safe_click(
        self,
        page,
        selector: str,
        retries: int = 3,
        backoff: float = 0.5,
    ) -> bool:
        """
        Click with retry + backoff.
        Handles layout shifts and overlay issues.
        """
        for attempt in range(retries):
            try:
                el = page.locator(selector).first
                await el.scroll_into_view_if_needed()
                await el.click(timeout=3000)
                logger.debug(f"Click succeeded | selector={selector}")
                return True
            except Exception as e:
                wait_time = backoff * (2 ** attempt)
                logger.warning(
                    f"Click failed attempt {attempt+1}/{retries} | "
                    f"selector={selector} | retry in {wait_time}s"
                )
                await asyncio.sleep(wait_time)

        logger.error(f"Click failed after {retries} retries | selector={selector}")
        return False

    async def wait_for_table(self, page, timeout: int = 15000) -> bool:
        """Wait for table hydration (financial grid)."""
        try:
            await page.wait_for_selector("div.tableBody div.row.lv-0", timeout=timeout)
            logger.debug("Table hydration detected")
            return True
        except Exception as e:
            logger.error(f"Table wait timeout: {e}")
            return False

    async def extract_table(self, page) -> dict:
        """
        Extract financial table data (no dynamic CSS hashes).
        Returns: {"headers": [...], "rows": [...]}
        """
        try:
            headers = await page.eval_on_selector_all(
                "div.tableHeader div.column[data-cpos]",
                """els => els.map(e => e.textContent.trim())""",
            )

            rows = await page.eval_on_selector_all(
                "div.tableBody div.row",
                """els => els.map(r => ({
                    depth: (r.className.match(/lv-(\\d)/)||[])[1] || '0',
                    label: r.querySelector('div.rowTitle')?.textContent.trim(),
                    cells: Array.from(r.querySelectorAll('div.column:not(.sticky)'))
                               .map(c => c.textContent.trim())
                }))""",
            )

            logger.info(f"Table extracted | headers={len(headers)} rows={len(rows)}")
            return {"headers": headers, "rows": rows, "extraction_time": time.time()}

        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
            return {"error": str(e), "headers": [], "rows": []}


browser_executor = BrowserExecutor()
