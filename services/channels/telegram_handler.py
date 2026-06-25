# ============================================================
# BusinessAIOS - services/channels/telegram_handler.py
# Telegram Bot — agentes accesibles desde Telegram
# ============================================================

import json
from datetime import datetime
from services.chat.chat_service import chat_service
from services.skills.skill_marketplace import skill_marketplace
from core.config import settings
from core.logger import get_logger

logger = get_logger("TelegramHandler")

# Sesiones activas: chat_id → {conv_id, agent_role, mode}
_sessions: dict[int, dict] = {}

AGENT_KEYBOARD = {
    "inline_keyboard": [[
        {"text": "⬡ CEO",       "callback_data": "agent:ceo"},
        {"text": "◈ Research",  "callback_data": "agent:research"},
    ], [
        {"text": "◆ Commercial","callback_data": "agent:commercial"},
        {"text": "◉ Content",   "callback_data": "agent:content"},
    ], [
        {"text": "◇ Finance",   "callback_data": "agent:finance"},
        {"text": "◎ Operations","callback_data": "agent:operations"},
    ]]
}

SKILL_KEYBOARD = {
    "inline_keyboard": [[
        {"text": "📊 SWOT",         "callback_data": "skill:swot_analysis"},
        {"text": "💰 Finanzas 12M", "callback_data": "skill:financial_projection"},
    ], [
        {"text": "🎯 Sales Funnel", "callback_data": "skill:sales_funnel"},
        {"text": "✍️ Viral Post",   "callback_data": "skill:viral_post_generator"},
    ], [
        {"text": "🔍 Competidores", "callback_data": "skill:competitor_analysis"},
        {"text": "📋 OKRs",         "callback_data": "skill:okr_builder"},
    ]]
}


class TelegramHandler:
    """
    Bot de Telegram para BusinessAIOS.
    Comandos: /start /agente /skills /help
    Inline keyboard para seleccionar agente o skill.
    """

    async def handle_update(self, update: dict) -> dict:
        """Procesa un update de Telegram."""
        try:
            # Callback de botón inline
            if "callback_query" in update:
                return await self._handle_callback(update["callback_query"])

            msg = update.get("message", {})
            if not msg:
                return {"status": "no_message"}

            chat_id = msg.get("chat", {}).get("id")
            text    = msg.get("text", "").strip()

            if not chat_id or not text:
                return {"status": "empty"}

            # Comandos
            if text.startswith("/start"):
                await self._send(chat_id, self._welcome_text(), AGENT_KEYBOARD)
                return {"status": "welcome"}

            if text.startswith("/agente") or text.startswith("/agent"):
                await self._send(chat_id, "🤖 Elige con qué agente quieres hablar:", AGENT_KEYBOARD)
                return {"status": "agent_menu"}

            if text.startswith("/skills"):
                await self._send(chat_id, "⚡ Elige un skill para ejecutar:", SKILL_KEYBOARD)
                return {"status": "skill_menu"}

            if text.startswith("/help"):
                await self._send(chat_id, self._help_text())
                return {"status": "help"}

            if text.startswith("/status"):
                from services.observability.monitor import monitor
                health = await monitor.full_health_check()
                status_text = (
                    f"🔍 *Estado del sistema*\n\n"
                    f"Estado: {health['status']}\n"
                    f"Versión: {health['version']}\n"
                    f"Latencia DB: {health['checks'].get('database', {}).get('latency_ms', '?')}ms\n"
                    f"LLM: {health['checks'].get('llm', {}).get('provider', '?')}"
                )
                await self._send(chat_id, status_text)
                return {"status": "ok"}

            # Mensaje normal → chat con agente activo
            session    = self._get_session(chat_id)
            agent_role = session.get("agent_role", "ceo")
            conv_id    = session["conv_id"]

            # Indicador de "escribiendo..."
            await self._send_typing(chat_id)

            result = await chat_service.chat(
                conversation_id=conv_id,
                user_message=text,
                agent_role=agent_role,
            )

            response = result["response"]
            agent_icon = {"ceo":"⬡","research":"◈","commercial":"◆",
                          "content":"◉","finance":"◇","operations":"◎"}.get(agent_role, "🤖")

            await self._send(
                chat_id,
                f"{agent_icon} *{agent_role.capitalize()} Agent*\n\n{response}"
            )
            return {"status": "ok", "agent": agent_role}

        except Exception as e:
            logger.error(f"Telegram handler error: {e}")
            return {"status": "error", "detail": str(e)}

    async def _handle_callback(self, callback: dict) -> dict:
        """Maneja clicks en botones inline."""
        chat_id  = callback.get("message", {}).get("chat", {}).get("id")
        data     = callback.get("data", "")
        cb_id    = callback.get("id")

        if not chat_id:
            return {"status": "no_chat"}

        # Responder al callback (elimina el spinner)
        await self._answer_callback(cb_id)

        if data.startswith("agent:"):
            role    = data.split(":", 1)[1]
            session = self._get_session(chat_id)
            session["agent_role"] = role

            icons = {"ceo":"⬡","research":"◈","commercial":"◆",
                     "content":"◉","finance":"◇","operations":"◎"}
            await self._send(
                chat_id,
                f"{icons.get(role,'🤖')} *{role.capitalize()} Agent* activado.\n\n"
                f"Ahora escríbeme lo que necesitas y te ayudo."
            )

        elif data.startswith("skill:"):
            skill_name = data.split(":", 1)[1]
            skill      = skill_marketplace.get_skill(skill_name)
            if skill:
                # Extraer parámetros requeridos
                import re
                params_needed = list(set(re.findall(r'\{(\w+)\}', skill.get("prompt_template", ""))))
                params_text   = "\n".join(f"• {p}" for p in params_needed)
                session = self._get_session(chat_id)
                session["pending_skill"]  = skill_name
                session["pending_params"] = {p: "" for p in params_needed}
                session["collecting"]     = params_needed[0] if params_needed else None

                await self._send(
                    chat_id,
                    f"⚡ *{skill['title']}*\n\n{skill['description']}\n\n"
                    f"Necesito los siguientes datos:\n{params_text}\n\n"
                    f"Empieza diciéndome: *{params_needed[0].replace('_',' ')}*" if params_needed
                    else f"Ejecutando *{skill['title']}*..."
                )

        return {"status": "callback_handled"}

    def _get_session(self, chat_id: int) -> dict:
        import uuid
        if chat_id not in _sessions:
            _sessions[chat_id] = {
                "conv_id":      str(uuid.uuid4()),
                "agent_role":   "ceo",
                "last_ts":      datetime.utcnow().timestamp(),
                "pending_skill": None,
                "collecting":   None,
            }
        _sessions[chat_id]["last_ts"] = datetime.utcnow().timestamp()
        return _sessions[chat_id]

    async def _send(self, chat_id: int, text: str, reply_markup: dict = None):
        token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        if not token:
            logger.warning("TELEGRAM_BOT_TOKEN no configurado")
            return

        # Telegram tiene límite de 4096 chars
        chunks = [text[i:i+4000] for i in range(0, len(text), 4000)]
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                for i, chunk in enumerate(chunks):
                    payload: dict = {
                        "chat_id":    chat_id,
                        "text":       chunk,
                        "parse_mode": "Markdown",
                    }
                    if reply_markup and i == len(chunks) - 1:
                        payload["reply_markup"] = json.dumps(reply_markup)
                    await client.post(
                        f"https://api.telegram.org/bot{token}/sendMessage",
                        json=payload,
                    )
        except Exception as e:
            logger.error(f"Telegram send error: {e}")

    async def _send_typing(self, chat_id: int):
        token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        if not token:
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"https://api.telegram.org/bot{token}/sendChatAction",
                    json={"chat_id": chat_id, "action": "typing"},
                )
        except Exception:
            pass

    async def _answer_callback(self, callback_id: str):
        token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        if not token or not callback_id:
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"https://api.telegram.org/bot{token}/answerCallbackQuery",
                    json={"callback_query_id": callback_id},
                )
        except Exception:
            pass

    async def set_webhook(self, url: str) -> dict:
        """Registra el webhook de Telegram automáticamente."""
        token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        if not token:
            return {"error": "TELEGRAM_BOT_TOKEN no configurado"}
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    f"https://api.telegram.org/bot{token}/setWebhook",
                    json={"url": f"{url}/channels/telegram/webhook"},
                )
                return r.json()
        except Exception as e:
            return {"error": str(e)}

    def _welcome_text(self) -> str:
        return (
            "👋 *Bienvenido a BusinessAIOS*\n\n"
            "Tengo 6 agentes de IA especializados listos para ayudarte:\n\n"
            "⬡ *CEO* — Estrategia y decisiones\n"
            "◈ *Research* — Análisis de mercado\n"
            "◆ *Commercial* — Ventas y funnels\n"
            "◉ *Content* — Marketing y copy\n"
            "◇ *Finance* — Proyecciones financieras\n"
            "◎ *Operations* — Procesos y OKRs\n\n"
            "Selecciona un agente o simplemente escríbeme y el CEO Agent te responde."
        )

    def _help_text(self) -> str:
        return (
            "📋 *Comandos disponibles*\n\n"
            "/start → Menú principal\n"
            "/agente → Cambiar agente activo\n"
            "/skills → Ejecutar un skill (SWOT, finanzas, etc)\n"
            "/status → Estado del sistema\n"
            "/help → Esta ayuda\n\n"
            "O simplemente escribe tu pregunta y el agente activo te responde."
        )


telegram_handler = TelegramHandler()
