# ============================================================
# BusinessAIOS - services/rag/rag_context.py
# FASE 8 — Inject semantic context into agent prompts
# ============================================================

from services.rag.vector_search import vector_search
from core.logger import get_logger

logger = get_logger("RAGContext")


class RAGContext:
    """
    Retrieves relevant knowledge for agent execution.
    Agents get semantic + category-based context automatically.
    """

    async def get_context_for_task(
        self,
        task_title: str,
        task_description: str,
        agent_role: str,
        limit: int = 3,
    ) -> str:
        """
        Build rich context for an agent based on the task.
        Uses semantic search + category filtering.
        """
        category = self._infer_category_for_agent(agent_role)
        query = f"{task_title} {task_description}"

        results = await vector_search.search_by_category_and_semantic(
            query_text=query,
            category=category,
            limit=limit,
        )

        if not results:
            return ""

        context_lines = [f"[Relevant Knowledge — {category}]"]
        for i, result in enumerate(results, 1):
            similarity = result.get("similarity", 0)
            title = result.get("title", "Unknown")
            content = result.get("content", "")[:200]
            context_lines.append(
                f"{i}. [{similarity:.2f}] {title}\n   {content}..."
            )

        logger.info(
            f"RAG context built | agent={agent_role} results={len(results)}"
        )
        return "\n".join(context_lines)

    def _infer_category_for_agent(self, agent_role: str) -> str:
        """Map agent role to knowledge category."""
        mapping = {
            "research": "market_research",
            "commercial": "sales",
            "content": "content",
            "finance": "finance",
            "operations": "operations",
            "ceo": "strategy",
        }
        return mapping.get(agent_role, "general")


rag_context = RAGContext()
