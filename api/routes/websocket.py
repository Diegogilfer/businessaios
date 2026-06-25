# ============================================================
# BusinessAIOS - api/routes/websocket.py
# FASE 6.2 — WebSocket endpoints for real-time streaming
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.websocket.ws_manager import ws_manager
from core.logger import get_logger

router = APIRouter(tags=["WebSocket (FASE 6.2)"])
logger = get_logger("WSRouter")


@router.websocket("/ws")
async def ws_global(websocket: WebSocket):
    """
    Global WebSocket — receives ALL system events.
    Useful for dashboards showing live activity across all tasks.
    """
    await ws_manager.connect(websocket, task_id=None)
    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, task_id=None)
        logger.info("Global WS client disconnected")


@router.websocket("/ws/{task_id}")
async def ws_task(websocket: WebSocket, task_id: str):
    """
    Task-specific WebSocket — streams events for a single task.

    Connect from client:
        const ws = new WebSocket(`ws://localhost:8000/ws/${taskId}`)
        ws.onmessage = (e) => console.log(JSON.parse(e.data))

    Events you'll receive:
        task_started, agent_started, agent_completed,
        collaboration_started, collaboration_completed,
        stream_progress, task_completed, task_failed
    """
    await ws_manager.connect(websocket, task_id=task_id)
    logger.info(f"WS client subscribed to task={task_id}")
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, task_id=task_id)
        logger.info(f"WS client disconnected from task={task_id}")
