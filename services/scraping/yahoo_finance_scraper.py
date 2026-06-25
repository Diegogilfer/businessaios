# ============================================================
# BusinessAIOS - services/scraping/yahoo_finance_scraper.py
# Yahoo Finance financials scraper (implements architecture report)
# ============================================================

from services.browser.browser_executor import browser_executor, PageStatus
from core.logger import get_logger

logger = get_logger("YahooFinanceScraper")


class YahooFinanceScraper:
    """
    Scrape Yahoo Finance financials for a ticker.
    Implements full recovery strategy from:
    yahoo_finance_architecture_report.md
    """

    async def scrape_financials(
        self,
        ticker: str,
        view: str = "quarterly",
        expand_rows: list[str] | None = None,
        max_retries: int = 3,
    ) -> dict:
        """
        Scrape Yahoo Finance financials page.

        Args:
            ticker: Stock ticker (e.g., "AAPL")
            view: "quarterly" or "annual"
            expand_rows: Row labels to expand (e.g., ["Total Revenue", "Operating Expense"])
            max_retries: Retry attempts on failure

        Returns:
            {"status": "ok", "data": {...}} or {"status": "blocked", "reason": "..."}
        """
        expand_rows = expand_rows or ["Total Revenue", "Operating Expense"]
        url = f"https://finance.yahoo.com/quote/{ticker}/financials/"

        for attempt in range(max_retries):
            logger.info(f"Scrape attempt {attempt+1}/{max_retries} | ticker={ticker}")

            try:
                page = await browser_executor.context.new_page()

                # Navigate
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                logger.debug(f"Page loaded | url={page.url}")

                # Verify
                status = await browser_executor.verify_page(page, ticker)
                logger.info(f"Page status: {status.value}")

                # Recovery paths
                if status == PageStatus.CONSENT_REQUIRED:
                    logger.warning("Consent gate detected")
                    await self._accept_consent(page)
                    await page.reload()
                    status = await browser_executor.verify_page(page, ticker)

                if status == PageStatus.BOT_CHALLENGE:
                    logger.error("Bot challenge detected — rotating proxy")
                    await page.close()
                    return {"status": "blocked", "reason": "bot_challenge"}

                if status == PageStatus.RATE_LIMITED:
                    logger.error("Rate limited (HTTP 999)")
                    await page.close()
                    return {"status": "rate_limited", "retry_after_seconds": 60}

                if status in (PageStatus.SHELL_ONLY, PageStatus.HYDRATION_INCOMPLETE):
                    logger.warning("Waiting for hydration...")
                    if not await browser_executor.wait_for_table(page):
                        logger.error("Hydration timeout")
                        await page.close()
                        continue

                # Select view (quarterly/annual)
                if view == "quarterly":
                    toggle = "#tab-quarterly"
                else:
                    toggle = "#tab-annual"

                success = await browser_executor.safe_click(page, toggle)
                if success:
                    await page.wait_for_function(
                        "() => document.querySelectorAll("
                        "'div.tableHeader div.column[data-cpos]').length >= 5"
                    )
                    logger.debug(f"Switched to {view} view")

                # Expand rows
                for label in expand_rows:
                    sel = f'div.tableBody button[aria-label="{label}"]'
                    if await browser_executor.safe_click(page, sel, retries=2):
                        try:
                            await page.wait_for_function(
                                "() => document.querySelectorAll('div.row.lv-1').length > 0",
                                timeout=3000,
                            )
                        except:
                            logger.warning(f"Row expansion may have failed: {label}")

                # Extract
                data = await browser_executor.extract_table(page)

                if not data.get("error"):
                    logger.info(f"Scrape successful | rows={len(data.get('rows', []))}")
                    await page.close()
                    return {
                        "status": "ok",
                        "ticker": ticker,
                        "view": view,
                        "data": data,
                    }

                await page.close()

            except Exception as e:
                logger.error(f"Scrape error (attempt {attempt+1}): {e}")
                if "page" in locals():
                    try:
                        await page.close()
                    except:
                        pass

        return {"status": "failed", "reason": "max_retries_exceeded"}

    async def _accept_consent(self, page):
        """Accept Yahoo consent gate (EU/UK)."""
        try:
            # Look for agree button in consent modal
            agree_btn = page.locator('button[name="agree"]')
            if await agree_btn.count() > 0:
                await agree_btn.click()
                logger.info("Consent accepted")
                await page.wait_for_load_state("networkidle")
        except Exception as e:
            logger.error(f"Consent acceptance failed: {e}")


yahoo_scraper = YahooFinanceScraper()
