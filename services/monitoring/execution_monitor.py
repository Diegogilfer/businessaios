# ============================================================
# BusinessAIOS - services/monitoring/execution_monitor.py
# UPGRADED: real metrics collection per execution
# ============================================================

from datetime import datetime
from core.logger import get_logger

logger = get_logger("ExecutionMonitor")


class ExecutionMonitor:
    """
    Tracks execution metrics in-memory.
    Provides aggregated stats for the /health and /metrics endpoints.
    Persists to Supabase executions table via event subscriber.
    """

    def __init__(self):
        self._records: list[dict] = []

    def start(self) -> dict:
        return {"started_at": datetime.utcnow().isoformat()}

    def finish(self, metadata: dict, result: dict | None = None) -> dict:
        metadata["finished_at"] = datetime.utcnow().isoformat()

        if result:
            metadata["quality_score"]  = result.get("quality_score", 0)
            metadata["agents_count"]   = len(result.get("agents_contributed", []))
            metadata["memory_saved"]   = result.get("memory_saved", False)
            metadata["knowledge_saved"]= result.get("knowledge_saved", False)
            metadata["status"]         = result.get("status", "unknown")

        self._records.append(dict(metadata))
        if len(self._records) > 500:
            self._records = self._records[-500:]

        return metadata

    def get_stats(self) -> dict:
        if not self._records:
            return {"total": 0}

        completed = [r for r in self._records if r.get("status") == "completed"]
        failed    = [r for r in self._records if r.get("status") == "failed"]
        scores    = [r["quality_score"] for r in completed if "quality_score" in r]

        return {
            "total":           len(self._records),
            "completed":       len(completed),
            "failed":          len(failed),
            "success_rate":    round(len(completed) / len(self._records), 2) if self._records else 0,
            "avg_quality":     round(sum(scores) / len(scores), 2) if scores else 0,
            "knowledge_saved": sum(1 for r in self._records if r.get("knowledge_saved")),
        }


execution_monitor = ExecutionMonitor()
