# ============================================================
# BusinessAIOS - services/rag/vector_search.py
# FASE 8 — Semantic similarity search using pgvector
# ============================================================

from core.logger import get_logger
from core.database import get_supabase

logger = get_logger("VectorSearch")


class VectorSearch:
    """
    Semantic search across knowledge base using vector similarity.
    Uses Supabase pgvector for <-> operator (cosine similarity).
    """

    def __init__(self):
        self.db = get_supabase()

    async def search(
        self,
        query_embedding: list[float],
        limit: int = 5,
        threshold: float = 0.6,
    ) -> list[dict]:
        """
        Search knowledge base by vector similarity.

        Args:
            query_embedding: The query vector (from Gemini embeddings)
            limit: Max results
            threshold: Min cosine similarity (0-1)

        Returns:
            List of matching knowledge entries with similarity scores
        """
        try:
            # Supabase RPC to pgvector cosine search
            response = self.db.rpc(
                "vector_search_knowledge",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": threshold,
                    "match_count": limit,
                },
            ).execute()

            results = response.data or []
            logger.info(f"Vector search | results={len(results)} threshold={threshold}")
            return results

        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

    async def search_by_text(
        self,
        query_text: str,
        limit: int = 5,
        threshold: float = 0.6,
    ) -> list[dict]:
        """
        Search by text query (convenience wrapper).
        Generates embedding first, then searches.
        """
        from services.rag.embedding_service import embedding_service

        query_embedding = await embedding_service.embed_text(query_text)
        if not query_embedding:
            logger.warning("Failed to generate query embedding")
            return []

        return await self.search(
            query_embedding=query_embedding,
            limit=limit,
            threshold=threshold,
        )

    async def search_by_category_and_semantic(
        self,
        query_text: str,
        category: str,
        limit: int = 5,
    ) -> list[dict]:
        """
        Hybrid search: category filter + semantic similarity.
        First narrows by category, then ranks by similarity.
        """
        from services.rag.embedding_service import embedding_service

        query_embedding = await embedding_service.embed_text(query_text)
        if not query_embedding:
            return []

        try:
            response = self.db.rpc(
                "hybrid_search_knowledge",
                {
                    "query_embedding": query_embedding,
                    "query_category": category,
                    "match_count": limit,
                },
            ).execute()

            results = response.data or []
            logger.info(f"Hybrid search | category={category} results={len(results)}")
            return results

        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []


vector_search = VectorSearch()
