# ============================================================
# BusinessAIOS - api/routes/observability.py
# Observabilidad: health, métricas, alertas manuales
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.observability.monitor import monitor

router = APIRouter(prefix="/observability", tags=["Observability"])


@router.get("/health", summary="★ Health check completo del sistema")
async def health_check():
    """
    Health check profundo: DB, LLM, memoria, auth.
    Usado por Docker, Railway, Fly.io y monitores externos (UptimeRobot, BetterStack).
    """
    return await monitor.full_health_check()


@router.get("/status", summary="Estado de integraciones de observabilidad")
async def obs_status():
    """Qué integraciones están activas (Sentry, Posthog, Slack)."""
    return {
        "integrations": monitor.status(),
        "setup_guide": {
            "sentry":  "Agrega SENTRY_DSN en .env → sentry.io",
            "posthog": "Agrega POSTHOG_API_KEY en .env → posthog.com",
            "slack":   "Agrega SLACK_WEBHOOK_URL en .env → slack.com/apps/webhooks",
        },
    }


class AlertRequest(BaseModel):
    message: str
    level:   str = "info"   # info | warning | error | success


@router.post("/alert", summary="Enviar alerta manual a Slack")
async def send_alert(data: AlertRequest):
    """Envía alerta manual al canal de Slack configurado."""
    sent = await monitor.alert_slack(data.message, data.level)
    if not sent:
        raise HTTPException(503, "Slack no configurado. Agrega SLACK_WEBHOOK_URL en .env")
    return {"sent": True, "level": data.level}
