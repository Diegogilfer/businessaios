# ============================================================
# BusinessAIOS - services/ecommerce/amazon/sp_api_connector.py
# FASE 10+ — Amazon SP-API connector for arbitrage
# ============================================================

import httpx
from datetime import datetime, timedelta
from core.logger import get_logger
from services.ecommerce.utils.rate_limiter import RateLimiter

logger = get_logger("AmazonSPAPI")


class AmazonSPAPIConnector:
    """
    Amazon Selling Partner API connector for product pricing.
    Uses OAuth2 (LWA - Login with Amazon) for authentication.
    """

    def __init__(self, client_id: str, client_secret: str, refresh_token: str, 
                 marketplace_id: str = "ATVPDKIKX0DER"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.marketplace_id = marketplace_id  # US marketplace
        self.access_token = None
        self.token_expiry = None
        self.base_url = "https://sellingpartnerapi-na.amazon.com"
        self.rate_limiter = RateLimiter(max_requests=1, window_seconds=1)

    async def authenticate(self) -> bool:
        """Get access token via LWA."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.amazon.com/auth/o2/token",
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": self.refresh_token,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                    },
                    timeout=10.0,
                )
                data = response.json()
                self.access_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                self.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                logger.info("Amazon SP-API authentication successful")
                return True
        except Exception as e:
            logger.error(f"Amazon SP-API auth failed: {e}")
            return False

    async def is_token_valid(self) -> bool:
        if not self.access_token or not self.token_expiry:
            return False
        return datetime.utcnow() < self.token_expiry

    async def get_pricing(self, asin: str) -> dict:
        """Get product pricing from Amazon."""
        if not await self.is_token_valid():
            if not await self.authenticate():
                return {}

        await self.rate_limiter.wait()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/products/pricing/v0/items/{asin}",
                    params={"MarketplaceId": self.marketplace_id},
                    headers={"x-amz-access-token": self.access_token},
                    timeout=10.0,
                )
                data = response.json()

                if "Payload" in data:
                    pricing = data["Payload"]
                    return {
                        "asin": asin,
                        "price": pricing.get("ListingPrice", {}).get("Amount"),
                        "currency": pricing.get("ListingPrice", {}).get("CurrencyCode"),
                        "shipping": pricing.get("Shipping", {}).get("Amount"),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                else:
                    logger.warning(f"No pricing data for {asin}: {data}")
                    return {}

        except Exception as e:
            logger.error(f"Get pricing error [{asin}]: {e}")
            return {}

    async def search_best_sellers(self, category: str = "Electronics", 
                                   subcategory: str = "Accessories",
                                   limit: int = 10) -> list[dict]:
        """
        Search for best-seller products in a category.
        Returns basic product info (ASIN, title, price).
        """
        if not await self.is_token_valid():
            await self.authenticate()

        await self.rate_limiter.wait()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/catalog/2022-04-01/items",
                    params={
                        "MarketplaceIds": self.marketplace_id,
                        "KeywordFilter": f"{category} {subcategory} best seller",
                        "pageSize": limit,
                    },
                    headers={"x-amz-access-token": self.access_token},
                    timeout=10.0,
                )
                data = response.json()
                products = []

                for item in data.get("items", [])[:limit]:
                    products.append({
                        "asin": item.get("asin"),
                        "title": item.get("attributes", {}).get("title", [""])[0],
                        "category": f"{category} > {subcategory}",
                    })

                logger.info(f"Found {len(products)} best-sellers in {category}")
                return products

        except Exception as e:
            logger.error(f"Search best sellers error: {e}")
            return []
