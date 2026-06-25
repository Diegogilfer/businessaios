# ============================================================
# BusinessAIOS - api/routes/projects.py
# Project management endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from models.schemas import ProjectCreate
from core.database import get_supabase
from core.logger import get_logger
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["Projects"])
logger = get_logger("ProjectsRouter")


@router.post("/", status_code=201)
async def create_project(data: ProjectCreate):
    try:
        db = get_supabase()
        payload = {
            "name": data.name,
            "description": data.description,
            "industry": data.industry,
            "target_market": data.target_market,
            "created_at": datetime.utcnow().isoformat(),
        }
        response = db.table("projects").insert(payload).execute()
        if not response.data:
            raise HTTPException(500, "Failed to create project")
        logger.info(f"Project created: {data.name}")
        return {"message": "Project created", "project": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/")
async def list_projects():
    try:
        db = get_supabase()
        response = db.table("projects").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{project_id}")
async def get_project(project_id: str):
    try:
        db = get_supabase()
        response = db.table("projects").select("*").eq("id", project_id).execute()
        if not response.data:
            raise HTTPException(404, f"Project {project_id} not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{project_id}/tasks")
async def get_project_tasks(project_id: str):
    """Get all tasks for a project."""
    try:
        db = get_supabase()
        response = (
            db.table("tasks")
            .select("*")
            .eq("project_id", project_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []
    except Exception as e:
        raise HTTPException(500, str(e))
