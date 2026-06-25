# ============================================================
# BusinessAIOS - api/routes/channels.py
# WhatsApp + Telegram webhooks
# ============================================================

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse
from services.channels.whatsapp_handler import whatsapp_handler
from services.channels.telegram_handler import telegram_handler
from core.logger import get_logger

router = APIRouter(prefix="/channels", tags=["Canales — WhatsApp & Telegram"])
logger = get_logger("ChannelsRouter")


# ── WhatsApp ──────────────────────────────────────────────────

@router.get("/whatsapp/webhook",
            response_class=PlainTextResponse,
            summary="Verificación webhook Meta (no tocar)")
async def whatsapp_verify(
    request: Request,
    hub_mode:       str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge:  str = Query(..., alias="hub.challenge"),
):
    """Meta llama aquí para verificar el webhook. Retorna el challenge."""
    challenge = whatsapp_handler.verify_webhook(hub_verify_token, hub_challenge)
    if challenge:
        return challenge
    raise HTTPException(403, "Token de verificación inválido")


@router.post("/whatsapp/webhook", summary="★ Recibir mensajes de WhatsApp")
async def whatsapp_message(request: Request):
    """
    Recibe mensajes de WhatsApp Business.
    Meta envía aquí cada mensaje de tus usuarios.

    Configurar en Meta Developers:
    - Webhook URL: https://TU_DOMINIO/channels/whatsapp/webhook
    - Verify Token: valor de WHATSAPP_VERIFY_TOKEN en .env
    - Suscribirse a: messages
    """
    sig  = request.headers.get("X-Hub-Signature-256", "")
    body = await request.body()

    if not whatsapp_handler.verify_signature(body, sig):
        raise HTTPException(401, "Firma inválida")

    payload = await request.json()
    result  = await whatsapp_handler.handle_message(payload)
    return result


@router.get("/whatsapp/menu", summary="Texto del menú de WhatsApp")
async def whatsapp_menu():
    """Retorna el texto del menú principal del bot de WhatsApp."""
    return {"menu": whatsapp_handler.get_menu_text()}


# ── Telegram ──────────────────────────────────────────────────

@router.post("/telegram/webhook", summary="★ Recibir updates de Telegram")
async def telegram_webhook(request: Request):
    """
    Recibe updates del bot de Telegram.
    Telegram envía aquí cada mensaje/interacción del usuario.

    Activar webhook:
    POST /channels/telegram/set-webhook?url=https://TU_DOMINIO
    """
    update = await request.json()
    result = await telegram_handler.handle_update(update)
    return result


@router.post("/telegram/set-webhook", summary="Registrar webhook de Telegram")
async def telegram_set_webhook(url: str = Query(..., description="URL pública del servidor")):
    """
    Registra el webhook de Telegram automáticamente.
    Llama a este endpoint una vez después de desplegar a producción.

    Ejemplo: POST /channels/telegram/set-webhook?url=https://api.businessaios.com
    """
    result = await telegram_handler.set_webhook(url)
    return result


@router.get("/status", summary="Estado de los canales configurados")
async def channels_status():
    """Qué canales están configurados y listos."""
    from core.config import settings
    return {
        "whatsapp": {
            "configured": bool(getattr(settings, "WHATSAPP_TOKEN", "")),
            "webhook_url": "/channels/whatsapp/webhook",
            "setup": {
                "1": "Crear app en developers.facebook.com",
                "2": "Agregar producto WhatsApp Business",
                "3": "Configurar vars: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET",
                "4": "Registrar webhook en Meta con URL pública",
            },
        },
        "telegram": {
            "configured": bool(getattr(settings, "TELEGRAM_BOT_TOKEN", "")),
            "webhook_url": "/channels/telegram/webhook",
            "setup": {
                "1": "Crear bot con @BotFather en Telegram",
                "2": "Copiar token a TELEGRAM_BOT_TOKEN en .env",
                "3": "Llamar a POST /channels/telegram/set-webhook?url=https://TU_DOMINIO",
            },
        },
    }
