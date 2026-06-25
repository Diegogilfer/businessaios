# ============================================================
# BusinessAIOS - api/routes/rag.py
# FASE 8 — RAG and semantic search endpoints
# ============================================================

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from core.logger import get_logger

router = APIRouter(prefix="/rag", tags=["RAG (FASE 8)"])
logger = get_logger("RAGRouter")


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 5
    threshold: float = 0.6


class HybridSearchRequest(BaseModel):
    query: str
    category: str
    limit: int = 5


@router.post("/search/semantic", summary="Semantic search across knowledge base")
async def semantic_search(data: SemanticSearchRequest):
    """
    Search knowledge base by semantic similarity.
    Uses vector embeddings to find conceptually related entries.

    Example:
        {"query": "how to increase sales revenue", "limit": 5}
    """
    try:
        from services.rag.vector_search import vector_search

        results = await vector_search.search_by_text(
            query_text=data.query,
            limit=data.limit,
            threshold=data.threshold,
        )

        return {
            "query": data.query,
            "count": len(results),
            "results": results,
        }

    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        raise HTTPException(500, str(e))


@router.post("/search/hybrid", summary="Category + semantic search")
async def hybrid_search(data: HybridSearchRequest):
    """
    Search by category + semantic similarity.
    Narrows by category, then ranks by semantic relevance.
    """
    try:
        from services.rag.vector_search import vector_search

        results = await vector_search.search_by_category_and_semantic(
            query_text=data.query,
            category=data.category,
            limit=data.limit,
        )

        return {
            "query": data.query,
            "category": data.category,
            "count": len(results),
            "results": results,
        }

    except Exception as e:
        logger.error(f"Hybrid search error: {e}")
        raise HTTPException(500, str(e))


@router.post("/embed", summary="Generate embeddings for text")
async def embed_text(query: str = Query(..., min_length=10)):
    """Generate a vector embedding for arbitrary text."""
    try:
        from services.rag.embedding_service import embedding_service

        embedding = await embedding_service.embed_text(query)
        if not embedding:
            raise HTTPException(500, "Failed to generate embedding")

        return {
            "text": query[:100],
            "embedding_dimension": len(embedding),
            "embedding": embedding,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/status", summary="RAG system status")
async def rag_status():
    """Check if RAG system is ready."""
    from core.database import get_supabase
    from core.config import settings

    db = get_supabase()
    has_embeddings_table = False

    try:
        resp = db.table("embeddings").select("id").limit(1).execute()
        has_embeddings_table = True
    except:
        pass

    return {
        "gemini_embeddings": "available" if settings.GEMINI_API_KEY else "not configured",
        "embeddings_table": "ready" if has_embeddings_table else "not initialized",
        "rag_ready": has_embeddings_table and bool(settings.GEMINI_API_KEY),
    }
