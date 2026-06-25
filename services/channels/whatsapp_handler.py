# ============================================================
# BusinessAIOS - services/channels/whatsapp_handler.py
# WhatsApp Business API (Meta Cloud API)
# Los clientes hablan con los agentes desde WhatsApp
# ============================================================

import hashlib
import hmac
import json
from datetime import datetime
from services.chat.chat_service import chat_service
from services.neuro_assist.neuro_assist import neuro_assist
from core.config import settings
from core.logger import get_logger

logger = get_logger("WhatsAppHandler")

# ── Mapeo de comandos a agentes ──────────────────────────────
COMMAND_MAP = {
    "/ceo":        "ceo",
    "/research":   "research",
    "/comercial":  "commercial",
    "/contenido":  "content",
    "/finanzas":   "finance",
    "/ops":        "operations",
    "/agente":     "ceo",   # default
}

# Sesiones activas: phone_number → {conv_id, agent_role, last_ts}
_sessions: dict[str, dict] = {}
SESSION_TTL = 3600  # 1 hora de inactividad resetea sesión


class WhatsAppHandler:
    """
    Maneja mensajes entrantes de WhatsApp y los enruta
    al agente correcto manteniendo la conversación con contexto.
    """

    def verify_webhook(self, token: str, challenge: str) -> str | None:
        """Verificación inicial del webhook de Meta."""
        verify_token = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "")
        if token == verify_token:
            return challenge
        return None

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verificar firma HMAC de Meta para seguridad."""
        secret = getattr(settings, "WHATSAPP_APP_SECRET", "")
        if not secret:
            return True  # Dev mode
        expected = "sha256=" + hmac.new(
            secret.encode(), payload, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def handle_message(self, payload: dict) -> dict:
        """
        Procesa un mensaje entrante de WhatsApp.
        Retorna la respuesta a enviar.
        """
        try:
            entry   = payload.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value   = changes.get("value", {})
            msgs    = value.get("messages", [])

            if not msgs:
                return {"status": "no_messages"}

            msg      = msgs[0]
            phone    = msg.get("from", "")
            msg_type = msg.get("type", "text")
            text     = ""

            if msg_type == "text":
                text = msg.get("text", {}).get("body", "").strip()
            elif msg_type == "audio":
                return await self._handle_audio_placeholder(phone)
            else:
                return {"status": "unsupported_type"}

            if not text:
                return {"status": "empty_message"}

            # Determinar agente y sesión
            agent_role, text_clean = self._parse_command(text)
            session    = self._get_or_create_session(phone, agent_role)
            conv_id    = session["conv_id"]

            logger.info(f"WhatsApp: {phone} → {agent_role}: {text_clean[:50]}")

            # Ejecutar chat
            result = await chat_service.chat(
                conversation_id=conv_id,
                user_message=text_clean,
                agent_role=agent_role,
            )

            response_text = result["response"]

            # Sugerencia proactiva del NeuroAssist
            suggestion = await neuro_assist.analyze_chat_context(
                conv_id, text_clean, agent_role
            )
            if suggestion and suggestion.get("message"):
                response_text += f"\n\n💡 {suggestion['message']}"

            # Enviar respuesta via WhatsApp API
            await self._send_message(phone, response_text)

            return {"status": "ok", "agent": agent_role, "phone": phone}

        except Exception as e:
            logger.error(f"WhatsApp handler error: {e}")
            return {"status": "error", "detail": str(e)}

    def _parse_command(self, text: str) -> tuple[str, str]:
        """Extrae el comando /agente del mensaje y devuelve (role, texto)."""
        for cmd, role in COMMAND_MAP.items():
            if text.lower().startswith(cmd):
                return role, text[len(cmd):].strip() or "Hola, ¿en qué me necesitas?"
        return "ceo", text  # default: CEO agent

    def _get_or_create_session(self, phone: str, agent_role: str) -> dict:
        """Mantiene sesión con conv_id por número de teléfono."""
        now = datetime.utcnow().timestamp()
        s   = _sessions.get(phone)

        # Crear nueva sesión si no existe o expiró
        if not s or (now - s.get("last_ts", 0)) > SESSION_TTL:
            import uuid
            conv_id = str(uuid.uuid4())
            _sessions[phone] = {
                "conv_id":   conv_id,
                "agent_role": agent_role,
                "last_ts":   now,
            }
        else:
            _sessions[phone]["last_ts"] = now
            # Cambiar agente si el usuario envió comando
            if agent_role != "ceo" or text_starts_with_cmd:
                _sessions[phone]["agent_role"] = agent_role

        return _sessions[phone]

    async def _send_message(self, to: str, text: str):
        """Envía mensaje de vuelta al usuario via Meta Cloud API."""
        phone_id = getattr(settings, "WHATSAPP_PHONE_ID", "")
        token    = getattr(settings, "WHATSAPP_TOKEN", "")
        if not phone_id or not token:
            logger.warning("WhatsApp: WHATSAPP_PHONE_ID o WHATSAPP_TOKEN no configurados")
            return

        # WhatsApp tiene límite de 4096 chars por mensaje
        chunks = [text[i:i+4000] for i in range(0, len(text), 4000)]

        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                for chunk in chunks:
                    await client.post(
                        f"https://graph.facebook.com/v19.0/{phone_id}/messages",
                        headers={"Authorization": f"Bearer {token}",
                                 "Content-Type": "application/json"},
                        json={
                            "messaging_product": "whatsapp",
                            "to":   to,
                            "type": "text",
                            "text": {"body": chunk},
                        },
                    )
        except Exception as e:
            logger.error(f"WhatsApp send error: {e}")

    async def _handle_audio_placeholder(self, phone: str) -> dict:
        await self._send_message(
            phone,
            "🎙️ Los mensajes de voz aún no están soportados.\n"
            "Escríbeme tu pregunta y con gusto te ayudo.\n\n"
            "Comandos disponibles:\n"
            "/ceo · /research · /comercial · /contenido · /finanzas · /ops"
        )
        return {"status": "audio_not_supported"}

    def get_menu_text(self) -> str:
        return (
            "🤖 *BusinessAIOS — Agentes de IA*\n\n"
            "Elige con qué agente quieres hablar:\n\n"
            "⬡ /ceo → Estrategia y decisiones\n"
            "◈ /research → Análisis de mercado\n"
            "◆ /comercial → Ventas y funnels\n"
            "◉ /contenido → Marketing y copy\n"
            "◇ /finanzas → Proyecciones y costos\n"
            "◎ /ops → Procesos y automatización\n\n"
            "O simplemente escríbeme y el CEO Agent te responde."
        )


whatsapp_handler = WhatsAppHandler()
