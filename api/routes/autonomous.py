# ============================================================
# BusinessAIOS - api/routes/autonomous.py
# FASE 9 — Autonomous Loop endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.logger import get_logger

router = APIRouter(prefix="/autonomous", tags=["Autonomous Loop (FASE 9)"])
logger = get_logger("AutonomousRouter")


class AutonomousRunRequest(BaseModel):
    task_id: str
    max_retries: int = 3


class AnalyzeRequest(BaseModel):
    title: str
    description: str


@router.post("/analyze", summary="Think phase — analyze task without executing")
async def analyze_task(data: AnalyzeRequest):
    """
    Runs ThinkEngine + PlanEngine on a task description.
    Returns analysis + execution plan without running anything.
    Useful for previewing what the system will do.
    """
    from services.autonomous.think import ThinkEngine
    from services.autonomous.plan import PlanEngine

    analysis = ThinkEngine().analyze_task(data.title, data.description)
    plan = PlanEngine().create_plan(data.title, data.description, analysis)
    return {"analysis": analysis, "plan": plan}


@router.post("/run", summary="★ Full autonomous loop — Think→Plan→Execute→Verify→Learn")
async def run_autonomous(data: AutonomousRunRequest):
    """
    Executes the full autonomous agent loop for a task.

    The loop runs until quality threshold is reached or max_retries exhausted.
    Each cycle: thinks, plans, executes agents, verifies output, learns from result.

    Returns full cycle history + final result.
    """
    try:
        from services.autonomous.autonomous_loop import AutonomousLoop
        from core.database import get_supabase

        db = get_supabase()
        resp = db.table("tasks").select("title,description").eq("id", data.task_id).execute()
        if not resp.data:
            raise HTTPException(404, f"Task '{data.task_id}' not found")

        task_data = resp.data[0]
        loop = AutonomousLoop()
        result = await loop.run(
            task_id=data.task_id,
            title=task_data.get("title", ""),
            description=task_data.get("description", ""),
            max_retries=data.max_retries,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Autonomous run error: {e}")
        raise HTTPException(500, str(e))


@router.get("/skills", summary="List available agent skills")
async def list_skills():
    from services.skills.skill_registry import skill_registry
    return skill_registry.list_skills()


@router.get("/tools", summary="List available tools")
async def list_tools():
    from services.tools.tool_registry import tool_registry
    return tool_registry.list_tools()
