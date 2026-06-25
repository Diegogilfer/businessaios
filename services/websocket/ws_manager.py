# ============================================================
# BusinessAIOS - services/websocket/ws_manager.py
# FASE 6.2 — WebSocket Manager
# Real-time event streaming to connected clients
# ============================================================

import json
import asyncio
from fastapi import WebSocket
from core.logger import get_logger

logger = get_logger("WSManager")


class WebSocketManager:
    """
    Manages active WebSocket connections.
    Clients subscribe to a task_id and receive live events.

    Usage:
        ws_manager = WebSocketManager()
        event_bus.register_ws_manager(ws_manager)

    Client connects:
        WS /ws/{task_id}

    Client receives JSON events:
        {"event": "agent_started",  "agent": "research", ...}
        {"event": "stream_progress","progress": 33, ...}
        {"event": "task_completed", "quality_score": 0.87, ...}
    """

    def __init__(self):
        # task_id → list of WebSocket connections
        self._connections: dict[str, list[WebSocket]] = {}
        # Global subscribers (receive all events)
        self._global: list[WebSocket] = []

    # ── Connection lifecycle ──────────────────────────────────

    async def connect(self, ws: WebSocket, task_id: str | None = None):
        await ws.accept()
        if task_id:
            self._connections.setdefault(task_id, []).append(ws)
            logger.info(f"WS connected | task={task_id}")
        else:
            self._global.append(ws)
            logger.info("WS global client connected")

    def disconnect(self, ws: WebSocket, task_id: str | None = None):
        if task_id and task_id in self._connections:
            self._connections[task_id] = [
                c for c in self._connections[task_id] if c != ws
            ]
        elif ws in self._global:
            self._global.remove(ws)
        logger.info(f"WS disconnected | task={task_id}")

    # ── Broadcasting ──────────────────────────────────────────

    async def broadcast(self, payload: dict):
        """
        Called by EventBus on every event.
        Routes to task-specific + global subscribers.
        """
        task_id = payload.get("task_id")
        message = json.dumps(payload)

        targets: list[WebSocket] = list(self._global)
        if task_id and task_id in self._connections:
            targets += self._connections[task_id]

        dead = []
        for ws in targets:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        # Prune dead connections
        for ws in dead:
            self.disconnect(ws, task_id)

    async def send_to_task(self, task_id: str, payload: dict):
        """Send a message only to subscribers of a specific task."""
        await self.broadcast({**payload, "task_id": task_id})

    def active_count(self) -> dict:
        return {
            "global": len(self._global),
            "task_connections": {k: len(v) for k, v in self._connections.items()},
        }


ws_manager = WebSocketManager()
