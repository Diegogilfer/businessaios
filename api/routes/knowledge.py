# ============================================================
# BusinessAIOS - api/routes/knowledge.py
# Global Knowledge Base endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from models.schemas import KnowledgeCreate
from services.knowledge.knowledge_service import KnowledgeService
from core.logger import get_logger

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])
logger = get_logger("KnowledgeRouter")
svc = KnowledgeService()


@router.post("/", status_code=201)
async def save_knowledge(data: KnowledgeCreate):
    """Manually save a knowledge entry."""
    result = svc.save_knowledge(
        title=data.title,
        content=data.content,
        category=data.category.value,
        source_agent=data.source_agent,
        tags=data.tags,
    )
    if not result:
        raise HTTPException(500, "Failed to save knowledge")
    return {"message": "Knowledge saved", "entry": result}


@router.get("/recent")
async def get_recent(limit: int = 10):
    """Get most recently added knowledge entries."""
    return svc.get_recent(limit=limit)


@router.get("/category/{category}")
async def get_by_category(category: str, limit: int = 10):
    """Get knowledge entries by category."""
    return svc.get_knowledge_by_category(category=category, limit=limit)


@router.get("/stats")
async def knowledge_stats():
    """Per-agent knowledge counts, total and today — for the live memory panel."""
    return svc.get_stats()


@router.get("/agent/{agent_role}")
async def get_by_agent(agent_role: str, limit: int = 20):
    """Get knowledge entries contributed by a specific agent."""
    return svc.get_by_agent(agent_role=agent_role, limit=limit)


@router.get("/search")
async def search_knowledge(category: str, keywords: str | None = None, limit: int = 5):
    """Search knowledge entries by category and optional keywords."""
    return svc.search_by_category(category=category, keywords=keywords, limit=limit)
