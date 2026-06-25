# ============================================================
# BusinessAIOS - services/events/subscribers.py
# UPGRADED: Structured logging + Supabase audit persistence
# ============================================================

from core.logger import get_logger
from services.events.event_types import EventType

logger = get_logger("EventSubscribers")


def log_event(payload: dict):
    """Log every event with structured context."""
    event = payload.get("event", "unknown")
    task_id = payload.get("task_id", "-")
    ts = payload.get("timestamp", "-")
    logger.info(f"[{ts}] EVENT:{event} | task={task_id} | {payload}")


async def persist_event_to_db(payload: dict):
    """
    Async subscriber — persist events to executions table for audit trail.
    Only persists TASK_COMPLETED and TASK_FAILED to keep table lean.
    """
    auditable = {EventType.TASK_COMPLETED, EventType.TASK_FAILED}
    event = payload.get("event", "")
    if event not in auditable:
        return

    try:
        from core.database import get_supabase
        db = get_supabase()
        db.table("executions").insert({
            "task_id":               payload.get("task_id"),
            "agent_used":            payload.get("agent_used", "ceo"),
            "collaboration_used":    payload.get("collaboration_used", False),
            "quality_score":         payload.get("quality_score", 0),
            "execution_time_seconds": payload.get("execution_time", 0),
            "status":                "completed" if event == EventType.TASK_COMPLETED else "failed",
            "error":                 payload.get("error"),
        }).execute()
    except Exception as e:
        logger.error(f"Failed to persist event to DB: {e}")


def register_default_subscribers(bus):
    """Wire default subscribers onto the event bus."""
    # All events → structured log
    for et in [
        EventType.TASK_STARTED, EventType.TASK_COMPLETED, EventType.TASK_FAILED,
        EventType.COLLABORATION_STARTED, EventType.COLLABORATION_COMPLETED,
        EventType.AGENT_STARTED, EventType.AGENT_COMPLETED,
        EventType.DELEGATION_STARTED, EventType.DELEGATION_COMPLETED,
        EventType.LOOP_CYCLE_STARTED, EventType.LOOP_CYCLE_COMPLETED,
    ]:
        bus.subscribe(et, log_event)

    # Task terminal events → DB audit
    bus.subscribe_async(EventType.TASK_COMPLETED, persist_event_to_db)
    bus.subscribe_async(EventType.TASK_FAILED, persist_event_to_db)

    logger.info("Default event subscribers registered")
