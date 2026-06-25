# ============================================================
# BusinessAIOS - api/routes/agents.py
# Agent CRUD + list definitions
# ============================================================

from fastapi import APIRouter, HTTPException
from models.schemas import AgentCreate, AgentResponse
from services.agents.agent_definitions import AGENT_DEFINITIONS, get_agent_definition
from core.database import get_supabase
from core.logger import get_logger
from datetime import datetime

router = APIRouter(prefix="/agents", tags=["Agents"])
logger = get_logger("AgentsRouter")


@router.get("/definitions")
async def list_agent_definitions():
    """List all built-in agent definitions and their capabilities."""
    return [
        {
            "id": agent.id,
            "name": agent.name,
            "role": agent.role,
            "goal": agent.goal,
            "specialty": agent.specialty,
            "collaboration_weight": agent.collaboration_weight,
        }
        for agent in AGENT_DEFINITIONS.values()
    ]


@router.post("/", status_code=201)
async def create_agent(data: AgentCreate):
    """Create a custom agent (stored in Supabase agents table)."""
    try:
        db = get_supabase()
        payload = {
            "name": data.name,
            "role": data.role.value,
            "goal": data.goal,
            "personality": data.personality,
            "created_at": datetime.utcnow().isoformat(),
        }
        if data.project_id:
            payload["project_id"] = data.project_id

        response = db.table("agents").insert(payload).execute()
        if not response.data:
            raise HTTPException(500, "Failed to create agent")

        logger.info(f"Agent created: {data.name} ({data.role.value})")
        return {"message": "Agent created", "agent": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/")
async def list_agents():
    """List all custom agents from the database."""
    try:
        db = get_supabase()
        response = db.table("agents").select("*").execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """Get a specific agent by ID."""
    try:
        db = get_supabase()
        response = db.table("agents").select("*").eq("id", agent_id).execute()
        if not response.data:
            raise HTTPException(404, f"Agent {agent_id} not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
