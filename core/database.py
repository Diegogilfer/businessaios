# ============================================================
# BusinessAIOS - core/database.py
# Supabase client singleton
# ============================================================

from supabase import create_client, Client
from core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Return Supabase singleton client."""
    global _client
    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError(
                "Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in .env"
            )
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client
