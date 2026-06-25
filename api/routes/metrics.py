# ============================================================
# BusinessAIOS - api/routes/metrics.py
# Observability — execution stats + event history
# ============================================================

from fastapi import APIRouter, Query
from services.monitoring.execution_monitor import execution_monitor
from services.events.event_bus import event_bus
from core.logger import get_logger

router = APIRouter(prefix="/metrics", tags=["Metrics & Observability"])
logger = get_logger("MetricsRouter")


@router.get("/", summary="Execution statistics")
async def get_metrics():
    return execution_monitor.get_stats()


@router.get("/events", summary="Recent event history")
async def get_events(
    event: str | None = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=200),
):
    return event_bus.get_history(event_name=event, limit=limit)


@router.get("/events/task/{task_id}", summary="All events for a specific task")
async def get_task_events(task_id: str):
    return event_bus.get_task_events(task_id)


@router.get("/websocket", summary="Active WebSocket connections")
async def ws_connections():
    from services.websocket.ws_manager import ws_manager
    return ws_manager.active_count()
