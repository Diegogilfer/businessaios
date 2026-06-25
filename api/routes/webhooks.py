# ============================================================
# BusinessAIOS - api/routes/webhooks.py
# Webhook management endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.webhooks.webhook_service import webhook_service
from core.logger import get_logger

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
logger = get_logger("WebhookRouter")


class WebhookRequest(BaseModel):
    event_type: str
    url: str


@router.post("/register", summary="Register webhook")
async def register_webhook(data: WebhookRequest):
    """Register a webhook URL for an event."""
    webhook_service.register(data.event_type, data.url)
    return {
        "status": "registered",
        "event": data.event_type,
        "url": data.url,
    }


@router.get("/events", summary="Available webhook events")
async def get_webhook_events():
    """List available webhook event types."""
    return {
        "events": [
            "arbitrage.opportunities_found",
            "neuro.prediction",
            "task.completed",
            "agent.finished",
        ]
    }
