# ============================================================
# BusinessAIOS - api/routes/dashboard.py
# Dashboard data endpoints (JSON only, no UI)
# For frontend to consume (FASE 7 ready)
# ============================================================

from fastapi import APIRouter, Depends
from services.saas.tenant_middleware import get_tenant_from_request
from services.analytics.analytics_engine import analytics_engine
from services.ecommerce.arbitrage.neuro_profile import neuro_profile
from services.execution.execution_engine import ExecutionEngine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview")
async def dashboard_overview(tenant_id: str = Depends(get_tenant_from_request)):
    """Main dashboard overview card."""
    health = await analytics_engine.get_system_health()
    return {
        "tenant_id": tenant_id,
        "health_score": health.get("health_score", 0),
        "executions": health.get("execution_stats", {}).get("completed", 0),
        "agents": len(health.get("agent_performance", {}).get("agents", {})),
    }

@router.get("/execution-timeline")
async def execution_timeline(tenant_id: str = Depends(get_tenant_from_request), days: int = 7):
    """Execution timeline for last N days."""
    stats = await analytics_engine.get_execution_stats(days)
    return {
        "period": f"Last {days} days",
        "total": stats.get("total_executions"),
        "completed": stats.get("completed"),
        "success_rate": stats.get("success_rate"),
        "avg_quality": stats.get("avg_quality"),
    }

@router.get("/agent-performance")
async def agent_performance(tenant_id: str = Depends(get_tenant_from_request)):
    """Agent performance comparison chart."""
    perf = await analytics_engine.get_agent_performance()
    return {
        "agents": perf.get("agents", {}),
    }

@router.get("/knowledge-growth")
async def knowledge_growth(tenant_id: str = Depends(get_tenant_from_request)):
    """Knowledge base growth over time."""
    kb = await analytics_engine.get_knowledge_growth()
    return {
        "total": kb.get("total_entries", 0),
        "new_this_week": kb.get("new_this_week", 0),
        "status": kb.get("growth_rate", "INACTIVE"),
    }

@router.get("/arbitrage-opportunities")
async def arbitrage_opportunities(tenant_id: str = Depends(get_tenant_from_request)):
    """Recent arbitrage opportunities."""
    # This would connect to opportunities table
    return {
        "message": "Configure Amazon + AliExpress credentials to see opportunities",
        "high_roi_opportunities": 0,
        "total_scans": 0,
    }

@router.get("/neuro-prediction")
async def neuro_prediction(tenant_id: str = Depends(get_tenant_from_request)):
    """NeuroProfile prediction for next scan."""
    pred = await neuro_profile.predict_next_best_category()
    return {
        "prediction": pred.get("prediction"),
        "confidence": pred.get("confidence", 0),
        "recommendation": f"Scan {pred.get('prediction')} category next for best ROI",
    }

@router.get("/system-health")
async def system_health(tenant_id: str = Depends(get_tenant_from_request)):
    """Full system health dashboard."""
    health = await analytics_engine.get_system_health()
    return health
