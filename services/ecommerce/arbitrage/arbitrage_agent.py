# ============================================================
# BusinessAIOS - services/ecommerce/arbitrage/arbitrage_agent.py
# FASE 10+ — Autonomous Arbitrage Intelligence Agent
# ============================================================

from datetime import datetime
from services.ecommerce.amazon.sp_api_connector import AmazonSPAPIConnector
from services.ecommerce.aliexpress.affiliate_api_connector import AliExpressAffiliateConnector
from services.ecommerce.arbitrage.margin_calculator import margin_calculator
from services.events.event_bus import event_bus
from services.events.event_types import EventType
from core.logger import get_logger

logger = get_logger("ArbitrageAgent")


class ArbitrageAgent:
    """
    Autonomous e-commerce arbitrage intelligence agent.
    Finds cross-border arbitrage opportunities (Amazon ↔ AliExpress).
    Rates: 275%+ ROI opportunities.
    """

    def __init__(self, amazon_config: dict, aliexpress_config: dict):
        self.amazon = AmazonSPAPIConnector(
            client_id=amazon_config.get("client_id"),
            client_secret=amazon_config.get("client_secret"),
            refresh_token=amazon_config.get("refresh_token"),
            marketplace_id=amazon_config.get("marketplace_id", "ATVPDKIKX0DER"),
        )
        self.aliexpress = AliExpressAffiliateConnector(
            app_key=aliexpress_config.get("app_key"),
            app_secret=aliexpress_config.get("app_secret"),
            access_token=aliexpress_config.get("access_token"),
        )
        logger.info("ArbitrageAgent initialized")

    async def scan_category(
        self,
        category: str = "Electronics",
        subcategory: str = "Accessories",
        limit: int = 20,
    ) -> dict:
        """
        Scan Amazon best-sellers in a category for arbitrage opportunities.

        Returns structured opportunities ranked by ROI.
        """
        logger.info(f"Starting arbitrage scan | category={category} subcategory={subcategory}")

        event_bus.publish(EventType.TASK_STARTED, {
            "task": "arbitrage_scan",
            "category": category,
            "timestamp": datetime.utcnow().isoformat(),
        })

        opportunities = []

        # Step 1: Get Amazon best-sellers
        amazon_products = await self.amazon.search_best_sellers(
            category=category,
            subcategory=subcategory,
            limit=limit,
        )

        logger.info(f"Found {len(amazon_products)} Amazon best-sellers")

        # Step 2: For each Amazon product, find AliExpress equivalents
        for amazon_product in amazon_products:
            asin = amazon_product.get("asin")
            title = amazon_product.get("title", "")

            # Get Amazon pricing
            amazon_pricing = await self.amazon.get_pricing(asin)
            if not amazon_pricing.get("price"):
                logger.warning(f"No pricing data for {asin}")
                continue

            amazon_price = float(amazon_pricing["price"])

            # Search for equivalent on AliExpress
            search_keywords = self._extract_keywords(title)
            aliexpress_products = await self.aliexpress.search_products(
                keywords=search_keywords,
                min_price=1.0,
                max_price=amazon_price / 3,  # Look for much cheaper suppliers
                limit=3,
            )

            # Evaluate each AliExpress match
            for supplier_product in aliexpress_products:
                supplier_price = supplier_product.get("price_usd", 0)
                shipping_cost = self._estimate_shipping_cost(supplier_product)

                # Calculate margins
                analysis = margin_calculator.calculate(
                    amazon_price=amazon_price,
                    supplier_price=supplier_price,
                    shipping_cost=shipping_cost,
                    supplier_rating=supplier_product.get("supplier_rating", 95.0),
                    moq=1,
                    shipping_days=supplier_product.get("shipping_days", 30),
                )

                if analysis.viable:
                    opportunity = {
                        "scan_timestamp": datetime.utcnow().isoformat(),
                        "amazon": {
                            "asin": asin,
                            "title": title,
                            "price": amazon_price,
                            "category": f"{category} > {subcategory}",
                        },
                        "supplier": {
                            "platform": "AliExpress",
                            "product_id": supplier_product.get("product_id"),
                            "title": supplier_product.get("title"),
                            "base_price": supplier_product.get("price_usd"),
                            "shipping_cost": shipping_cost,
                            "shipping_days": supplier_product.get("shipping_days"),
                            "supplier_rating": supplier_product.get("supplier_rating"),
                        },
                        "financials": {
                            "amazon_price": analysis.amazon_price,
                            "supplier_price": analysis.supplier_price,
                            "shipping_cost": analysis.shipping_cost,
                            "total_cost": analysis.total_cost,
                            "gross_margin": analysis.gross_margin,
                            "net_margin": analysis.net_margin,
                            "net_margin_percent": analysis.net_margin_percent,
                            "roi_percent": analysis.roi_percent,
                        },
                        "risk": {
                            "level": analysis.risk_level,
                            "warnings": analysis.warnings,
                        },
                    }
                    opportunities.append(opportunity)
                    logger.info(
                        f"Found opportunity | ASIN={asin} | "
                        f"ROI={analysis.roi_percent}% | Margin=${analysis.net_margin}"
                    )

        # Step 3: Rank by ROI
        ranked = sorted(opportunities, key=lambda o: o["financials"]["roi_percent"], reverse=True)

        result = {
            "scan_timestamp": datetime.utcnow().isoformat(),
            "category": category,
            "subcategory": subcategory,
            "total_opportunities": len(ranked),
            "opportunities": ranked[:20],  # Top 20
            "stats": {
                "avg_roi": sum(o["financials"]["roi_percent"] for o in ranked) / len(ranked)
                if ranked else 0,
                "avg_margin": sum(o["financials"]["net_margin"] for o in ranked) / len(ranked)
                if ranked else 0,
                "high_risk_count": sum(1 for o in ranked if o["risk"]["level"] == "HIGH"),
            },
        }

        event_bus.publish(EventType.TASK_COMPLETED, {
            "task": "arbitrage_scan",
            "opportunities_found": len(ranked),
            "timestamp": datetime.utcnow().isoformat(),
        })

        logger.info(
            f"Arbitrage scan complete | "
            f"Opportunities: {len(ranked)} | "
            f"Avg ROI: {result['stats']['avg_roi']:.1f}%"
        )

        return result

    def _extract_keywords(self, title: str) -> str:
        """Extract search keywords from Amazon title."""
        # Take first 4 words as search keywords
        words = title.split()[:4]
        return " ".join(words)

    def _estimate_shipping_cost(self, product: dict) -> float:
        """Estimate shipping cost based on product data."""
        # AliExpress typically charges $0.50-3.00 for ePacket to US
        # Using a conservative estimate
        return 1.50


from core.config import settings

arbitrage_agent = ArbitrageAgent(
    amazon_config={
        "client_id":     settings.AMAZON_CLIENT_ID,
        "client_secret": settings.AMAZON_CLIENT_SECRET,
        "refresh_token": settings.AMAZON_REFRESH_TOKEN,
    },
    aliexpress_config={
        "app_key":    settings.ALIEXPRESS_APP_KEY,
        "app_secret": settings.ALIEXPRESS_APP_SECRET,
    },
)
