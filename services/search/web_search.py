# ============================================================
# BusinessAIOS - services/search/web_search.py
# FASE 8 — Real web search integration
# ============================================================

import httpx
from core.logger import get_logger
from core.config import settings

logger = get_logger("WebSearch")


class WebSearchProvider:
    """
    Web search implementation.
    Integrates with SerpAPI / Tavily / or fallback to stub.

    To enable real search:
    1. Set SERP_API_KEY or TAVILY_API_KEY in .env
    2. Or implement your own search provider
    """

    def __init__(self):
        self.serp_key = getattr(settings, "SERP_API_KEY", None)
        self.tavily_key = getattr(settings, "TAVILY_API_KEY", None)

    async def search(self, query: str, limit: int = 5) -> list[dict]:
        """Execute web search. Returns snippets with URLs."""

        if self.serp_key:
            return await self._search_serpapi(query, limit)
        elif self.tavily_key:
            return await self._search_tavily(query, limit)
        else:
            logger.warning("No search API key configured — returning stub results")
            return self._stub_search(query, limit)

    async def _search_serpapi(self, query: str, limit: int) -> list[dict]:
        """Search using SerpAPI (Google SERP)."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "q": query,
                        "api_key": self.serp_key,
                        "num": limit,
                    },
                    timeout=10.0,
                )

            data = response.json()
            results = []

            for item in data.get("organic_results", [])[:limit]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                })

            logger.info(f"SerpAPI search | query='{query}' results={len(results)}")
            return results

        except Exception as e:
            logger.error(f"SerpAPI search failed: {e}")
            return []

    async def _search_tavily(self, query: str, limit: int) -> list[dict]:
        """Search using Tavily API."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self.tavily_key,
                        "query": query,
                        "max_results": limit,
                    },
                    timeout=10.0,
                )

            data = response.json()
            results = []

            for item in data.get("results", [])[:limit]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                })

            logger.info(f"Tavily search | query='{query}' results={len(results)}")
            return results

        except Exception as e:
            logger.error(f"Tavily search failed: {e}")
            return []

    def _stub_search(self, query: str, limit: int) -> list[dict]:
        """Fallback stub when no API is configured."""
        return [
            {
                "title": f"[Stub] Search result for '{query}'",
                "url": "https://example.com",
                "snippet": (
                    "Configure SERP_API_KEY or TAVILY_API_KEY in .env "
                    "to enable real web search. "
                    f"Query was: {query}"
                ),
            }
        ]


web_search_provider = WebSearchProvider()
