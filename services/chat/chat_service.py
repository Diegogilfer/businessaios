# ============================================================
# BusinessAIOS - services/chat/chat_service.py
# FASE 7.5 — Chat conversacional con agentes en tiempo real
# ============================================================

import uuid
import time
from datetime import datetime
from services.agents.agent_definitions import AGENT_DEFINITIONS
from services.events.event_bus import event_bus
from core.logger import get_logger

logger = get_logger("ChatService")


class ChatService:

    def __init__(self):
        self._llm = None
        self._db  = None

    @property
    def llm(self):
        if self._llm is None:
            from services.providers.llm_provider import get_llm_provider
            self._llm = get_llm_provider()
        return self._llm

    @property
    def db(self):
        if self._db is None:
            from core.database import get_supabase
            self._db = get_supabase()
        return self._db

    async def create_conversation(self, agent_role: str, title: str = "") -> dict:
        agent   = AGENT_DEFINITIONS.get(agent_role)
        if not agent:
            raise ValueError(f"Agente desconocido: {agent_role}")
        conv_id = str(uuid.uuid4())
        record  = {
            "id": conv_id, "agent_role": agent_role,
            "agent_name": agent.name,
            "title": title or f"Chat con {agent.name}",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        try:
            self.db.table("conversations").insert(record).execute()
        except Exception as e:
            logger.warning(f"Supabase no disponible (modo memoria): {e}")
        return record

    async def get_history(self, conversation_id: str, limit: int = 20) -> list:
        try:
            r = (self.db.table("chat_messages").select("*")
                 .eq("conversation_id", conversation_id)
                 .order("created_at", desc=False).limit(limit).execute())
            return r.data or []
        except Exception:
            return []

    async def list_conversations(self, agent_role: str = None) -> list:
        try:
            q = self.db.table("conversations").select("*").order("updated_at", desc=True)
            if agent_role:
                q = q.eq("agent_role", agent_role)
            return q.limit(50).execute().data or []
        except Exception:
            return []

    async def save_message(self, conversation_id: str, role: str, content: str, agent_role: str = "") -> dict:
        msg = {
            "id": str(uuid.uuid4()), "conversation_id": conversation_id,
            "role": role, "content": content, "agent_role": agent_role,
            "created_at": datetime.utcnow().isoformat(),
        }
        try:
            self.db.table("chat_messages").insert(msg).execute()
            self.db.table("conversations").update({"updated_at": datetime.utcnow().isoformat()}).eq("id", conversation_id).execute()
        except Exception as e:
            logger.warning(f"No se pudo guardar mensaje: {e}")
        return msg

    async def chat(self, conversation_id: str, user_message: str, agent_role: str) -> dict:
        start = time.time()
        agent = AGENT_DEFINITIONS.get(agent_role)
        if not agent:
            raise ValueError(f"Agente desconocido: {agent_role}")

        history = await self.get_history(conversation_id, limit=20)

        # Construir contexto con historial
        lines = [f"=== Conversación con {agent.name} ===\n"]
        if history:
            for msg in history[-12:]:
                prefix = "Usuario" if msg["role"] == "user" else agent.name
                lines.append(f"{prefix}: {msg['content']}")
            lines.append("")
        lines.append(f"Usuario: {user_message}")
        lines.append(f"\nResponde como {agent.name}. Recuerda el contexto anterior.")
        prompt = "\n".join(lines)

        event_bus.publish("chat.thinking", {
            "conversation_id": conversation_id,
            "agent_role": agent_role, "agent_name": agent.name,
        })

        response = await self.llm.generate(prompt=prompt, system_context=agent.system_prompt)
        elapsed  = round(time.time() - start, 2)

        await self.save_message(conversation_id, "user",      user_message, agent_role)
        await self.save_message(conversation_id, "assistant", response,     agent_role)

        event_bus.publish("chat.response", {
            "conversation_id": conversation_id,
            "agent_role": agent_role, "agent_name": agent.name,
            "elapsed_seconds": elapsed,
        })

        return {
            "conversation_id": conversation_id,
            "agent_role": agent_role, "agent_name": agent.name,
            "user_message": user_message, "response": response,
            "elapsed_seconds": elapsed,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def delete_conversation(self, conversation_id: str) -> bool:
        try:
            self.db.table("chat_messages").delete().eq("conversation_id", conversation_id).execute()
            self.db.table("conversations").delete().eq("id", conversation_id).execute()
            return True
        except Exception:
            return False


chat_service = ChatService()
