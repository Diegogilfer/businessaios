# ============================================================
# BusinessAIOS - services/analytics/analytics_engine.py
# System-wide analytics and metrics
# ============================================================

from datetime import datetime, timedelta
from core.logger import get_logger

logger = get_logger("Analytics")


class AnalyticsEngine:
    """Aggregate metrics across system."""

    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            from core.database import get_supabase
            self._db = get_supabase()
        return self._db

    async def get_execution_stats(self, days: int = 7) -> dict:
        """Execution statistics."""
        try:
            since = (datetime.utcnow() - timedelta(days=days)).isoformat()
            resp = self.db.table("executions").select(
                "status, quality_score, execution_time_seconds"
            ).gt("created_at", since).execute()

            if not resp.data:
                return {"status": "NO_DATA"}

            completed = len([r for r in resp.data if r["status"] == "completed"])
            failed = len([r for r in resp.data if r["status"] == "failed"])
            scores = [r["quality_score"] for r in resp.data if r["quality_score"]]

            return {
                "period_days": days,
                "total_executions": len(resp.data),
                "completed": completed,
                "failed": failed,
                "success_rate": round(completed / len(resp.data), 2) if resp.data else 0,
                "avg_quality": round(sum(scores) / len(scores), 2) if scores else 0,
            }
        except Exception as e:
            logger.error(f"Stats error: {e}")
            return {}

    async def get_agent_performance(self) -> dict:
        """Per-agent performance metrics."""
        try:
            resp = self.db.table("executions").select(
                "agent_used, quality_score, status"
            ).execute()

            agents = {}
            for row in resp.data:
                agent = row.get("agent_used", "unknown")
                if agent not in agents:
                    agents[agent] = {"count": 0, "scores": [], "success": 0}
                agents[agent]["count"] += 1
                if row.get("quality_score"):
                    agents[agent]["scores"].append(row["quality_score"])
                if row.get("status") == "completed":
                    agents[agent]["success"] += 1

            return {
                "agents": {
                    ag: {
                        "executions": data["count"],
                        "avg_quality": round(sum(data["scores"]) / len(data["scores"]), 2)
                        if data["scores"] else 0,
                        "success_rate": round(data["success"] / data["count"], 2),
                    }
                    for ag, data in agents.items()
                }
            }
        except Exception as e:
            return {}

    async def get_knowledge_growth(self) -> dict:
        """Knowledge base growth."""
        try:
            resp = self.db.table("global_knowledge").select("id, created_at").execute()
            if not resp.data:
                return {"total": 0}

            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            new_week = len([r for r in resp.data if r["created_at"] > week_ago])

            return {
                "total_entries": len(resp.data),
                "new_this_week": new_week,
                "growth_rate": "ACTIVE" if new_week > 0 else "INACTIVE",
            }
        except Exception as e:
            return {}

    async def get_system_health(self) -> dict:
        """Overall system health."""
        stats = await self.get_execution_stats(7)
        agents = await self.get_agent_performance()
        kb = await self.get_knowledge_growth()

        health_score = 0
        if stats.get("success_rate", 0) > 0.8:
            health_score += 40
        if agents.get("agents") and len(agents["agents"]) > 3:
            health_score += 30
        if kb.get("total_entries", 0) > 50:
            health_score += 30

        return {
            "health_score": health_score,
            "execution_stats": stats,
            "agent_performance": agents,
            "knowledge_growth": kb,
            "timestamp": datetime.utcnow().isoformat(),
        }


analytics_engine = AnalyticsEngine()
