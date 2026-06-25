# ============================================================
# BusinessAIOS - services/knowledge/knowledge_service.py
# Global Knowledge Base — shared intelligence across agents
# ============================================================

from datetime import datetime
from typing import Optional
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("KnowledgeService")


class KnowledgeService:
    """
    Manages global_knowledge table.
    All agents can read and contribute to this shared knowledge base.
    """

    TABLE = "global_knowledge"

    def save_knowledge(
        self,
        title: str,
        content: str,
        category: str,
        source_agent: str | None = None,
        tags: list[str] | None = None,
    ) -> dict | None:
        """Save a new knowledge entry."""
        try:
            db = get_supabase()
            payload = {
                "title": title[:255],
                "content": content[:10000],
                "category": category,
                "source_agent": source_agent,
                "tags": tags or [],
                "created_at": datetime.utcnow().isoformat(),
            }
            response = db.table(self.TABLE).insert(payload).execute()
            if response.data:
                logger.info(f"Knowledge saved | title='{title}' category={category}")
                return response.data[0]
        except Exception as e:
            logger.error(f"Failed to save knowledge: {e}")
        return None

    def get_recent(self, limit: int = 10) -> list[dict]:
        """Get the most recently added knowledge entries."""
        try:
            db = get_supabase()
            response = (
                db.table(self.TABLE)
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get recent knowledge: {e}")
            return []

    def get_knowledge_by_category(
        self, category: str, limit: int = 10
    ) -> list[dict]:
        """Get knowledge entries filtered by category."""
        try:
            db = get_supabase()
            response = (
                db.table(self.TABLE)
                .select("*")
                .eq("category", category)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get knowledge by category '{category}': {e}")
            return []

    def search_by_category(
        self,
        category: str,
        keywords: str | None = None,
        limit: int = 5,
    ) -> list[dict]:
        """
        Search knowledge entries by category, optionally filtering by keywords in title.
        Full-text search can be added later with Supabase FTS.
        """
        try:
            db = get_supabase()
            query = (
                db.table(self.TABLE)
                .select("*")
                .eq("category", category)
                .order("created_at", desc=True)
                .limit(limit)
            )
            if keywords:
                query = query.ilike("title", f"%{keywords}%")

            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to search knowledge: {e}")
            return []

    def get_context_for_agent(
        self, agent_role: str, limit: int = 5
    ) -> str:
        """
        Get relevant knowledge formatted as context string for LLM prompt injection.
        Maps agent roles to their relevant categories.
        """
        role_category_map = {
            "research":   "market_research",
            "commercial": "sales",
            "content":    "content",
            "ceo":        "strategy",
            "finance":    "finance",
            "operations": "operations",
        }
        category = role_category_map.get(agent_role, "general")
        entries = self.get_knowledge_by_category(category, limit=limit)

        if not entries:
            return ""

        context_lines = [f"[Relevant Knowledge — {category}]"]
        for entry in entries:
            context_lines.append(f"• {entry['title']}: {entry['content'][:300]}...")

        return "\n".join(context_lines)
