# ============================================================
# BusinessAIOS - services/ecommerce/arbitrage/arbitrage_engine.py
# Arbitrage detection & opportunity ranking engine
# ============================================================

import asyncio
from datetime import datetime
from typing import AsyncIterator
from services.ecommerce.arbitrage.margin_calculator import margin_calculator
from services.ecommerce.amazon.sp_api_connector import amazon_connector
from services.ecommerce.aliexpress.affiliate_api_connector import aliexpress_connector
from core.logger import get_logger
from core.database import get_supabase

logger = get_logger("ArbitrageEngine")


class ArbitrageOpportunity:
    """Single arbitrage opportunity."""

    def __init__(
        self,
        amazon_asin: str,
        amazon_title: str,
        amazon_price: float,
        amazon_rating: float,
        amazon_review_count: int,
        supplier_product_id: str,
        supplier_name: str,
        supplier_price: float,
        supplier_rating: float,
        shipping_cost: float,
        shipping_days: int,
        margin_data: dict,
    ):
        self.amazon_asin = amazon_asin
        self.amazon_title = amazon_title
        self.amazon_price = amazon_price
        self.amazon_rating = amazon_rating
        self.amazon_review_count = amazon_review_count
        self.supplier_product_id = supplier_product_id
        self.supplier_name = supplier_name
        self.supplier_price = supplier_price
        self.supplier_rating = supplier_rating
        self.shipping_cost = shipping_cost
        self.shipping_days = shipping_days
        self.margin_data = margin_data
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "scan_timestamp": self.timestamp,
            "amazon": {
                "asin": self.amazon_asin,
                "title": self.amazon_title,
                "price": self.amazon_price,
                "rating": self.amazon_rating,
                "review_count": self.amazon_review_count,
            },
            "supplier": {
                "platform": self.supplier_name,
                "product_id": self.supplier_product_id,
                "price": self.supplier_price,
                "rating": self.supplier_rating,
                "shipping_cost": self.shipping_cost,
                "shipping_days": self.shipping_days,
            },
            **self.margin_data,
        }


class ArbitrageEngine:
    """
    Detects cross-border arbitrage opportunities.
    Compares Amazon prices with AliExpress wholesale prices.
    """

    def __init__(self):
        self.db = get_supabase()

    async def scan_category(
        self,
        category: str,
        min_rating: float = 4.0,
        limit: int = 50,
    ) -> list[ArbitrageOpportunity]:
        """
        Scan a category for arbitrage opportunities.
        
        Note: This is a simplified version. Real implementation would:
        1. Get best-seller list from Amazon (via scraping or third-party data)
        2. For each product, search AliExpress for equivalent
        3. Calculate margins
        4. Rank by viability score
        """
        logger.info(f"Scanning category: {category} | min_rating={min_rating}")

        opportunities = []

        try:
            # Step 1: Get Amazon best-sellers (stub - needs real data source)
            amazon_products = await amazon_connector.search_by_category(
                category, min_rating, limit
            )

            if not amazon_products:
                logger.warning(f"No Amazon products found for category: {category}")
                return []

            # Step 2: For each Amazon product, find AliExpress equivalent
            for amazon_product in amazon_products:
                logger.debug(f"Processing Amazon product: {amazon_product.get('asin')}")

                # Search AliExpress for similar products
                aliexpress_products = await aliexpress_connector.search_products(
                    keywords=amazon_product.get("keywords", amazon_product.get("title")),
                    limit=3,  # Top 3 cheapest suppliers
                )

                # Calculate margins for each AliExpress match
                for ali_product in aliexpress_products:
                    margin_data = margin_calculator.calculate(
                        amazon_price=amazon_product.get("price", 0),
                        supplier_price=ali_product.get("price", 0),
                        shipping_cost=ali_product.get("shipping_cost", 2.5),
                        amazon_rating=amazon_product.get("rating", 4.0),
                        supplier_rating=ali_product.get("supplier_rating", 95),
                        shipping_days=ali_product.get("shipping_days", 15),
                    )

                    # Only keep viable opportunities
                    if margin_data["viable"] and margin_data["viability_score"] >= 60:
                        opp = ArbitrageOpportunity(
                            amazon_asin=amazon_product.get("asin"),
                            amazon_title=amazon_product.get("title"),
                            amazon_price=amazon_product.get("price"),
                            amazon_rating=amazon_product.get("rating", 4.0),
                            amazon_review_count=amazon_product.get("review_count", 0),
                            supplier_product_id=ali_product.get("product_id"),
                            supplier_name="AliExpress",
                            supplier_price=ali_product.get("price"),
                            supplier_rating=ali_product.get("supplier_rating"),
                            shipping_cost=ali_product.get("shipping_cost"),
                            shipping_days=ali_product.get("shipping_days", 15),
                            margin_data=margin_data,
                        )
                        opportunities.append(opp)

            # Sort by viability score descending
            opportunities.sort(
                key=lambda o: o.margin_data.get("viability_score", 0),
                reverse=True,
            )

            logger.info(
                f"Found {len(opportunities)} viable arbitrage opportunities in {category}"
            )
            return opportunities

        except Exception as e:
            logger.error(f"Arbitrage scan error: {e}")
            return []

    async def save_opportunity(self, opportunity: ArbitrageOpportunity) -> dict | None:
        """Save discovered opportunity to database for tracking."""
        try:
            response = self.db.table("arbitrage_opportunities").insert({
                "amazon_asin": opportunity.amazon_asin,
                "amazon_title": opportunity.amazon_title,
                "amazon_price": opportunity.amazon_price,
                "amazon_rating": opportunity.amazon_rating,
                "supplier_product_id": opportunity.supplier_product_id,
                "supplier_name": opportunity.supplier_name,
                "supplier_price": opportunity.supplier_price,
                "net_margin": opportunity.margin_data.get("net_margin"),
                "roi_percent": opportunity.margin_data.get("roi_percent"),
                "viability_score": opportunity.margin_data.get("viability_score"),
                "risk_level": opportunity.margin_data.get("risk_level"),
                "data_json": opportunity.to_dict(),
                "discovered_at": datetime.utcnow().isoformat(),
            }).execute()

            if response.data:
                logger.info(f"Opportunity saved | asin={opportunity.amazon_asin}")
                return response.data[0]

        except Exception as e:
            logger.error(f"Failed to save opportunity: {e}")

        return None


arbitrage_engine = ArbitrageEngine()
