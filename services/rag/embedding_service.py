# ============================================================
# BusinessAIOS - services/rag/embedding_service.py
# FASE 8 — Embedding generation + storage
# ============================================================

import json
from core.logger import get_logger

logger = get_logger("EmbeddingService")


class EmbeddingService:
    """
    Generates embeddings for knowledge entries using Gemini API.
    Stores vectors in Supabase pgvector.
    Enables semantic search across knowledge base.
    """

    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            from core.database import get_supabase
            self._db = get_supabase()
        return self._db

    async def embed_text(self, text: str) -> list[float] | None:
        """
        Generate embedding vector for text using Gemini API.
        Returns list of 3072 floats (gemini-embedding-2-flash, GA 2025).
        """
        try:
            import asyncio
            from google import genai
            from core.config import settings

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            model = "gemini-embedding-2-flash"

            response = await asyncio.to_thread(
                client.models.embed_content,
                model=model,
                contents=text,
            )

            embedding = response.embeddings[0].values
            logger.debug(f"Embedding generated | dim={len(embedding)}")
            return embedding

        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return None

    async def save_embedding(
        self,
        knowledge_id: str,
        text: str,
        embedding: list[float],
    ) -> dict | None:
        """Save embedding to embeddings table."""
        try:
            response = self.db.table("embeddings").insert({
                "knowledge_id": knowledge_id,
                "text_preview": text[:500],
                "embedding": embedding,
            }).execute()

            if response.data:
                logger.info(f"Embedding saved | knowledge={knowledge_id}")
                return response.data[0]
        except Exception as e:
            logger.error(f"Failed to save embedding: {e}")

        return None

    async def embed_and_save(
        self,
        knowledge_id: str,
        text: str,
    ) -> bool:
        """Generate embedding and save in one operation."""
        embedding = await self.embed_text(text)
        if embedding:
            result = await self.save_embedding(knowledge_id, text, embedding)
            return result is not None
        return False

    def get_embedding_for_knowledge(self, knowledge_id: str) -> list[float] | None:
        """Retrieve stored embedding for a knowledge entry."""
        try:
            response = self.db.table("embeddings").select("embedding").eq(
                "knowledge_id", knowledge_id
            ).execute()
            if response.data:
                return response.data[0]["embedding"]
        except Exception as e:
            logger.error(f"Failed to get embedding: {e}")
        return None


embedding_service = EmbeddingService()
