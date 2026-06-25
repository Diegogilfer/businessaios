# ============================================================
# BusinessAIOS - api/routes/chat.py
# FASE 7.5 — Endpoints de chat conversacional
# ============================================================

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
from services.chat.chat_service import chat_service
from services.websocket.ws_manager import ws_manager
from services.agents.agent_definitions import AGENT_DEFINITIONS
from core.logger import get_logger

router = APIRouter(prefix="/chat", tags=["Chat (FASE 7.5)"])
logger = get_logger("ChatRouter")


# ── Schemas ──────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    agent_role: str
    title: Optional[str] = ""

class ChatMessage(BaseModel):
    conversation_id: str
    agent_role: str
    message: str


# ── Conversaciones ───────────────────────────────────────────

@router.post("/conversations", summary="Crear nueva conversación")
async def create_conversation(data: ConversationCreate):
    """
    Crea una conversación con un agente específico.
    Retorna el conversation_id para usar en los mensajes.
    """
    if data.agent_role not in AGENT_DEFINITIONS:
        raise HTTPException(400, f"Agente inválido: {data.agent_role}. Opciones: {list(AGENT_DEFINITIONS.keys())}")
    return await chat_service.create_conversation(data.agent_role, data.title)


@router.get("/conversations", summary="Listar conversaciones")
async def list_conversations(agent_role: Optional[str] = None):
    return await chat_service.list_conversations(agent_role)


@router.get("/conversations/{conversation_id}", summary="Obtener conversación")
async def get_conversation(conversation_id: str):
    conv = await chat_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(404, "Conversación no encontrada")
    return conv


@router.delete("/conversations/{conversation_id}", summary="Eliminar conversación")
async def delete_conversation(conversation_id: str):
    ok = await chat_service.delete_conversation(conversation_id)
    return {"deleted": ok, "conversation_id": conversation_id}


@router.get("/conversations/{conversation_id}/messages", summary="Historial de mensajes")
async def get_messages(conversation_id: str, limit: int = 50):
    return await chat_service.get_history(conversation_id, limit)


# ── Chat ─────────────────────────────────────────────────────

@router.post("/message", summary="★ Enviar mensaje al agente")
async def send_message(data: ChatMessage):
    """
    Envía un mensaje a un agente y recibe su respuesta.

    El agente recuerda el historial de la conversación.

    Ejemplo:
    ```json
    {
      "conversation_id": "uuid-de-tu-conv",
      "agent_role": "research",
      "message": "Analiza el mercado de e-commerce en Colombia"
    }
    ```
    """
    if data.agent_role not in AGENT_DEFINITIONS:
        raise HTTPException(400, f"Agente inválido: {data.agent_role}")
    try:
        return await chat_service.chat(
            conversation_id=data.conversation_id,
            user_message=data.message,
            agent_role=data.agent_role,
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, {"error": str(e), "hint": "Verifica DEEPSEEK_API_KEY o GEMINI_API_KEY en .env"})


# ── WebSocket Chat en tiempo real ────────────────────────────

@router.websocket("/ws/{conversation_id}")
async def chat_ws(websocket: WebSocket, conversation_id: str):
    """
    WebSocket para chat en tiempo real.
    El cliente envía: {"agent_role": "research", "message": "..."}
    El servidor responde: {"type": "thinking"|"response"|"error", ...}

    Ejemplo JS:
        const ws = new WebSocket('ws://localhost:8000/chat/ws/<conv_id>')
        ws.onmessage = (e) => { const msg = JSON.parse(e.data); console.log(msg) }
        ws.send(JSON.stringify({ agent_role: 'research', message: 'Hola' }))
    """
    await ws_manager.connect(websocket, task_id=f"chat_{conversation_id}")
    logger.info(f"Chat WS conectado: conv={conversation_id}")

    try:
        while True:
            raw = await websocket.receive_text()
            import json
            try:
                data = json.loads(raw)
                agent_role = data.get("agent_role", "ceo")
                message    = data.get("message", "")

                if not message.strip():
                    continue

                # Notificar "pensando..."
                await websocket.send_text(json.dumps({
                    "type": "thinking",
                    "agent_role": agent_role,
                    "message": "El agente está procesando tu mensaje...",
                }))

                # Generar respuesta
                result = await chat_service.chat(
                    conversation_id=conversation_id,
                    user_message=message,
                    agent_role=agent_role,
                )

                # Enviar respuesta completa
                await websocket.send_text(json.dumps({
                    "type":       "response",
                    "agent_role": result["agent_role"],
                    "agent_name": result["agent_name"],
                    "response":   result["response"],
                    "elapsed":    result["elapsed_seconds"],
                    "timestamp":  result["timestamp"],
                }))

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "message": "JSON inválido"}))
            except Exception as e:
                await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, task_id=f"chat_{conversation_id}")
        logger.info(f"Chat WS desconectado: conv={conversation_id}")


# ── Utilidades ───────────────────────────────────────────────

@router.get("/agents", summary="Listar agentes disponibles para chat")
async def list_chat_agents():
    return [
        {
            "role":      role,
            "name":      ag.name,
            "goal":      ag.goal,
            "specialty": ag.specialty,
        }
        for role, ag in AGENT_DEFINITIONS.items()
    ]
