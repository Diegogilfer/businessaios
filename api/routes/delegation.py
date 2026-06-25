# ============================================================
# BusinessAIOS - api/routes/delegation.py
# FASE 5.2 — CEO Auto-Delegation endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from models.schemas import DelegateRequest
from services.delegation.delegation_engine import DelegationEngine
from core.logger import get_logger

router = APIRouter(prefix="/delegation", tags=["Delegation (FASE 5.2)"])
logger = get_logger("DelegationRouter")
engine = DelegationEngine()


@router.post("/plan")
async def create_plan(data: DelegateRequest):
    """
    CEO creates a delegation plan from a high-level business objective.
    Returns the plan WITHOUT executing it.
    """
    try:
        logger.info(f"Creating delegation plan: {data.objective[:60]}")
        plan = await engine.create_delegation_plan(
            objective=data.objective,
            project_context="",
        )
        return {"objective": data.objective, "plan": plan}
    except Exception as e:
        logger.error(f"Delegation plan error: {e}")
        raise HTTPException(500, str(e))


@router.post("/execute")
async def execute_delegation(data: DelegateRequest):
    """
    ★ Full autonomous delegation:
    1. CEO breaks objective into sub-tasks
    2. Assigns to specialist agents
    3. Executes in sequence
    4. CEO consolidates final business plan

    Example objective: "Open a Premium Spa in Cali, Colombia"
    """
    try:
        logger.info(f"Executing delegation: {data.objective[:60]}")
        result = await engine.execute_delegation(
            objective=data.objective,
        )
        return result
    except Exception as e:
        logger.error(f"Delegation execute error: {e}")
        raise HTTPException(500, str(e))
