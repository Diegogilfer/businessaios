# ============================================================
# BusinessAIOS - services/ecommerce/aliexpress/affiliate_api_connector.py
# FASE 10+ — AliExpress Affiliate API connector
# ============================================================

import httpx
import hashlib
import time
from datetime import datetime
from core.logger import get_logger
from services.ecommerce.utils.rate_limiter import RateLimiter

logger = get_logger("AliExpressAPI")


class AliExpressAffiliateConnector:
    """
    AliExpress Affiliate API for product search and pricing.
    Uses official affiliate API with signature authentication.
    """

    def __init__(self, app_key: str, app_secret: str, access_token: str | None = None):
        self.app_key = app_key
        self.app_secret = app_secret
        self.access_token = access_token
        self.base_url = "https://api-sg.aliexpress.com/sync"
        self.rate_limiter = RateLimiter(max_requests=2, window_seconds=1)

    def _generate_signature(self, params: dict) -> str:
        """Generate HMAC signature for request."""
        sorted_params = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        sign_string = f"{self.app_secret}&{sorted_params}&{self.app_secret}"
        return hashlib.md5(sign_string.encode()).hexdigest().upper()

    async def search_products(self, keywords: str, min_price: float = 1.0, 
                              max_price: float = 50.0, limit: int = 10) -> list[dict]:
        """
        Search AliExpress for products by keywords.
        Returns product data with pricing and supplier info.
        """
        await self.rate_limiter.wait()

        params = {
            "app_key": self.app_key,
            "timestamp": str(int(time.time() * 1000)),
            "method": "aliexpress.affiliate.product.query",
            "keywords": keywords,
            "fields": "commission_type,sale_price,ship_days,evaluation_rate",
            "page_no": "1",
            "page_size": str(limit),
        }
        params["sign"] = self._generate_signature(params)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params=params,
                    timeout=10.0,
                )
                data = response.json()

                products = []
                for item in data.get("result", {}).get("products", []):
                    products.append({
                        "product_id": item.get("product_id"),
                        "title": item.get("product_title"),
                        "price_usd": float(item.get("sale_price", 0)),
                        "shipping_days": item.get("ship_days", 30),
                        "supplier_rating": float(item.get("evaluation_rate", 0)) * 100,
                        "url": item.get("product_main_image_url"),
                        "commission": item.get("commission_type"),
                    })

                logger.info(f"Found {len(products)} AliExpress products for '{keywords}'")
                return products

        except Exception as e:
            logger.error(f"AliExpress search error: {e}")
            return []

    async def get_product_details(self, product_id: str) -> dict:
        """Get detailed product info including shipping options."""
        await self.rate_limiter.wait()

        params = {
            "app_key": self.app_key,
            "timestamp": str(int(time.time() * 1000)),
            "method": "aliexpress.affiliate.product.details.get",
            "product_ids": product_id,
            "fields": "sale_price,ship_days,evaluation_rate,moq,category_id",
        }
        params["sign"] = self._generate_signature(params)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params=params,
                    timeout=10.0,
                )
                data = response.json()
                product = data.get("result", {}).get("products", [{}])[0]

                return {
                    "product_id": product.get("product_id"),
                    "title": product.get("product_title"),
                    "price": float(product.get("sale_price", 0)),
                    "shipping_days": product.get("ship_days", 30),
                    "supplier_rating": float(product.get("evaluation_rate", 0)) * 100,
                    "moq": int(product.get("moq", 1)),
                    "category": product.get("category_id"),
                }

        except Exception as e:
            logger.error(f"Get product details error [{product_id}]: {e}")
            return {}
