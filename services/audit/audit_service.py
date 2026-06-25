# ============================================================
# BusinessAIOS - Audit Service (Blueprint 2026-2028)
# Registra qué recopila, aprende y ejecuta cada agente
# ============================================================
import uuid
from datetime import datetime
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("AuditService")

class AuditService:
    def __init__(self):
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None
        self._buffer: list[dict] = []

    def log(self, event_type: str, agent_role: str, action: str,
            data: dict = None, tenant_id: str = "default") -> dict:
        record = {
            "id":         str(uuid.uuid4()),
            "event_type": event_type,   # "task_executed" | "memory_written" | "knowledge_created" | "chat_message"
            "agent_role": agent_role,
            "action":     action,
            "data":       data or {},
            "tenant_id":  tenant_id,
            "timestamp":  datetime.utcnow().isoformat(),
        }
        self._buffer.append(record)
        if len(self._buffer) >= 20:
            self._flush()
        logger.debug(f"AUDIT [{event_type}] {agent_role} → {action}")
        return record

    def _flush(self):
        if not self.db or not self._buffer:
            return
        try:
            self.db.table("audit_log").insert(self._buffer).execute()
            self._buffer.clear()
        except Exception as e:
            logger.warning(f"Audit flush failed: {e}")

    def get_agent_report(self, agent_role: str, days: int = 7) -> dict:
        if not self.db:
            return {"agent_role": agent_role, "events": [], "summary": "Supabase no disponible"}
        try:
            r = (self.db.table("audit_log").select("*")
                 .eq("agent_role", agent_role)
                 .order("timestamp", desc=True).limit(100).execute())
            events = r.data or []
            by_type: dict[str, int] = {}
            for ev in events:
                by_type[ev["event_type"]] = by_type.get(ev["event_type"], 0) + 1
            return {
                "agent_role":  agent_role,
                "total_events": len(events),
                "by_type":     by_type,
                "last_action": events[0]["action"] if events else None,
                "events":      events[:20],
            }
        except Exception as e:
            return {"error": str(e)}

audit_service = AuditService()
