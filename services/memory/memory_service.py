# ============================================================
# BusinessAIOS - services/memory/memory_service.py
# Agent memory persistence layer
# ============================================================

from datetime import datetime
from typing import Optional
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("MemoryService")


class MemoryService:
    """Manages agent_memories table — stores task execution results."""

    TABLE = "agent_memories"

    def save_memory(
        self,
        task_id: str,
        agent_id: str,
        result: str,
        objective: str,
        category: str = "general",
        quality_score: float = 0.0,
        success: bool = True,
    ) -> dict | None:
        """Save a new memory entry after task execution."""
        try:
            db = get_supabase()
            payload = {
                "task_id": task_id,
                "agent_id": agent_id,
                "result": result[:5000],  # Prevent oversized payloads
                "objective": objective[:500],
                "category": category,
                "quality_score": round(quality_score, 2),
                "success": success,
                "created_at": datetime.utcnow().isoformat(),
            }
            response = db.table(self.TABLE).insert(payload).execute()
            if response.data:
                logger.info(f"Memory saved | task={task_id} agent={agent_id} score={quality_score}")
                return response.data[0]
        except Exception as e:
            logger.error(f"Failed to save memory: {e}")
        return None

    def get_agent_memories(
        self,
        agent_id: str,
        limit: int = 10,
        category: str | None = None,
    ) -> list[dict]:
        """Retrieve recent memories for a specific agent."""
        try:
            db = get_supabase()
            query = (
                db.table(self.TABLE)
                .select("*")
                .eq("agent_id", agent_id)
                .order("created_at", desc=True)
                .limit(limit)
            )
            if category:
                query = query.eq("category", category)

            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get agent memories: {e}")
            return []

    def get_task_memories(self, task_id: str) -> list[dict]:
        """Get all memories associated with a task."""
        try:
            db = get_supabase()
            response = (
                db.table(self.TABLE)
                .select("*")
                .eq("task_id", task_id)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get task memories: {e}")
            return []

    def get_successful_memories(
        self,
        limit: int = 20,
        min_quality: float = 0.7,
    ) -> list[dict]:
        """Get high-quality successful memories across all agents."""
        try:
            db = get_supabase()
            response = (
                db.table(self.TABLE)
                .select("*")
                .eq("success", True)
                .gte("quality_score", min_quality)
                .order("quality_score", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get successful memories: {e}")
            return []
