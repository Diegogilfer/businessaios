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


@router.get("/search")
async def search_knowledge(category: str, keywords: str | None = None, limit: int = 5):
    """Search knowledge entries by category and optional keywords."""
    return svc.search_by_category(category=category, keywords=keywords, limit=limit)
