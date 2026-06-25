# ============================================================
# BusinessAIOS - services/webhooks/webhook_service.py
# Webhook notifications — persisted in Supabase
# ============================================================

import httpx
from datetime import datetime
from core.logger import get_logger

logger = get_logger("Webhooks")


class WebhookService:
    """
    Manages webhook notifications.
    Registrations are persisted in `webhook_endpoints` table so they
    survive server restarts.  Falls back to in-memory if DB is unavailable.
    """

    def __init__(self):
        self._db = None
        # Fallback in-memory cache (populated lazily from DB)
        self._cache: dict[str, list[str]] = {}

    @property
    def db(self):
        if self._db is None:
            try:
                from core.database import get_supabase
                self._db = get_supabase()
            except Exception:
                pass
        return self._db

    def register(self, event_type: str, url: str) -> bool:
        """Register webhook URL for an event type — persisted in DB."""
        # Persist to Supabase
        if self.db:
            try:
                self.db.table("webhook_endpoints").insert({
                    "event_type": event_type,
                    "url":        url,
                    "active":     True,
                    "created_at": datetime.utcnow().isoformat(),
                }).execute()
                logger.info(f"Webhook registered (DB): {event_type} → {url}")
                return True
            except Exception as e:
                logger.error(f"DB register error, using cache: {e}")

        # Fallback: in-memory
        self._cache.setdefault(event_type, [])
        if url not in self._cache[event_type]:
            self._cache[event_type].append(url)
        logger.info(f"Webhook registered (memory): {event_type} → {url}")
        return True

    def _get_urls(self, event_type: str) -> list[str]:
        """Fetch registered URLs for an event from DB (or cache)."""
        if self.db:
            try:
                resp = self.db.table("webhook_endpoints").select("url").eq(
                    "event_type", event_type
                ).eq("active", True).execute()
                return [row["url"] for row in (resp.data or [])]
            except Exception as e:
                logger.warning(f"DB fetch error, using cache: {e}")

        return self._cache.get(event_type, [])

    def list_webhooks(self) -> list[dict]:
        """Return all registered webhooks."""
        if self.db:
            try:
                resp = self.db.table("webhook_endpoints").select(
                    "id, event_type, url, active, created_at"
                ).order("created_at", desc=True).execute()
                return resp.data or []
            except Exception:
                pass
        # Flatten cache
        return [
            {"event_type": et, "url": url}
            for et, urls in self._cache.items()
            for url in urls
        ]

    def deactivate(self, webhook_id: str) -> bool:
        """Deactivate a webhook by its DB id."""
        if self.db:
            try:
                self.db.table("webhook_endpoints").update(
                    {"active": False}
                ).eq("id", webhook_id).execute()
                return True
            except Exception as e:
                logger.error(f"Deactivate error: {e}")
        return False

    async def send_webhook(self, event: str, data: dict) -> bool:
        """Send payload to all registered URLs for this event."""
        urls = self._get_urls(event)
        if not urls:
            return False

        payload = {
            "event":     event,
            "timestamp": datetime.utcnow().isoformat(),
            "data":      data,
        }

        for url in urls:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(url, json=payload, timeout=5.0)
                    logger.debug(f"Webhook sent: {event} → {url}")
            except Exception as e:
                logger.error(f"Webhook delivery error [{url}]: {e}")

        return True


webhook_service = WebhookService()
