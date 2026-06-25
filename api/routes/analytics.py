# ============================================================
# BusinessAIOS - api/routes/analytics.py
# System analytics and monitoring
# ============================================================

from fastapi import APIRouter
from services.analytics.analytics_engine import analytics_engine
from core.logger import get_logger

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = get_logger("AnalyticsRouter")


@router.get("/health", summary="System health")
async def system_health():
    """Overall system health and metrics."""
    return await analytics_engine.get_system_health()


@router.get("/executions", summary="Execution statistics")
async def execution_stats(days: int = 7):
    """Execution stats for last N days."""
    return await analytics_engine.get_execution_stats(days)


@router.get("/agents", summary="Agent performance")
async def agent_performance():
    """Per-agent performance metrics."""
    return await analytics_engine.get_agent_performance()


@router.get("/knowledge", summary="Knowledge base growth")
async def knowledge_growth():
    """Knowledge base growth metrics."""
    return await analytics_engine.get_knowledge_growth()
