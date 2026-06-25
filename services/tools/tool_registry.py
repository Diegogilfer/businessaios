# ============================================================
# BusinessAIOS - services/tools/tool_registry.py
# UPGRADED: Web scraping tools added
# ============================================================

import asyncio
from core.logger import get_logger

logger = get_logger("ToolRegistry")


class Tool:
    def __init__(self, name: str, description: str, handler, requires_auth: bool = False):
        self.name = name
        self.description = description
        self.handler = handler
        self.requires_auth = requires_auth

    async def execute(self, **kwargs):
        if asyncio.iscoroutinefunction(self.handler):
            return await self.handler(**kwargs)
        return self.handler(**kwargs)


class ToolRegistry:
    """
    Central tool registry — now includes web scraping tools.
    """

    def __init__(self):
        self._tools: dict[str, Tool] = {}
        self._register_builtins()

    def register(self, tool: Tool):
        self._tools[tool.name] = tool
        logger.info(f"Tool registered: {tool.name}")

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[dict]:
        return [
            {"name": t.name, "description": t.description, "requires_auth": t.requires_auth}
            for t in self._tools.values()
        ]

    async def invoke(self, name: str, **kwargs) -> dict:
        tool = self.get(name)
        if not tool:
            return {"error": f"Tool '{name}' not found", "available": list(self._tools.keys())}
        try:
            result = await tool.execute(**kwargs)
            logger.info(f"Tool invoked: {name} | success=True")
            return {"tool": name, "result": result, "success": True}
        except Exception as e:
            logger.error(f"Tool error [{name}]: {e}")
            return {"tool": name, "error": str(e), "success": False}

    def _register_builtins(self):
        """Register all built-in tools."""

        async def get_datetime():
            from datetime import datetime
            return datetime.utcnow().isoformat()

        def calculator(expression: str) -> float:
            allowed = set("0123456789+-*/.() ")
            if not all(c in allowed for c in expression):
                raise ValueError("Invalid expression")
            return eval(expression)

        async def web_search(query: str, limit: int = 5) -> list[dict]:
            from services.search.web_search import web_search_provider
            results = await web_search_provider.search(query, limit)
            return results

        async def knowledge_search(query: str, limit: int = 3) -> list[dict]:
            from services.rag.vector_search import vector_search
            results = await vector_search.search_by_text(query, limit=limit)
            return [
                {
                    "title": r.get("title"),
                    "content": r.get("content", "")[:300],
                    "similarity": r.get("similarity", 0),
                }
                for r in results
            ]

        async def scrape_yahoo_finance(ticker: str, view: str = "quarterly") -> dict:
            from services.scraping.yahoo_finance_scraper import yahoo_scraper
            result = await yahoo_scraper.scrape_financials(ticker=ticker, view=view)
            return result

        self.register(Tool("datetime", "Get current UTC datetime", get_datetime))
        self.register(Tool("calculator", "Evaluate a math expression", calculator))
        self.register(Tool("web_search", "Search the web for information", web_search))
        self.register(Tool("knowledge_search", "Search internal knowledge base semantically", knowledge_search))
        self.register(Tool(
            "scrape_yahoo_finance",
            "Scrape Yahoo Finance financials for a stock ticker",
            scrape_yahoo_finance,
            requires_auth=False,
        ))


tool_registry = ToolRegistry()
