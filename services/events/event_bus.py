# ============================================================
# BusinessAIOS - services/events/event_bus.py
# UPGRADED: async-safe, history ring buffer, WebSocket hooks
# ============================================================

import asyncio
from datetime import datetime
from collections import deque
from core.logger import get_logger

logger = get_logger("EventBus")


class EventBus:
    """
    Central event bus — sync + async subscribers, 200-event history.
    WebSocket manager hooks in via register_ws_manager().
    """

    MAX_HISTORY = 200

    def __init__(self):
        self.subscribers: dict[str, list] = {}
        self.async_subscribers: dict[str, list] = {}
        self.history: deque = deque(maxlen=self.MAX_HISTORY)
        self._ws_manager = None          # injected at startup

    # ── Registration ─────────────────────────────────────────

    def subscribe(self, event_name: str, callback):
        """Register a sync callback."""
        self.subscribers.setdefault(event_name, []).append(callback)

    def subscribe_async(self, event_name: str, callback):
        """Register an async callback (coroutine function)."""
        self.async_subscribers.setdefault(event_name, []).append(callback)

    def register_ws_manager(self, manager):
        """Inject WebSocket manager so events stream to clients."""
        self._ws_manager = manager
        logger.info("WebSocket manager registered on EventBus")

    # ── Publishing ────────────────────────────────────────────

    def publish(self, event_name: str, payload: dict):
        """Publish event — fires all sync callbacks, queues async ones."""
        payload["event"] = event_name
        payload["timestamp"] = datetime.utcnow().isoformat()
        self.history.append(dict(payload))

        # Sync callbacks
        for cb in self.subscribers.get(event_name, []):
            try:
                cb(payload)
            except Exception as e:
                logger.error(f"EventBus sync subscriber error [{event_name}]: {e}")

        # Async callbacks — schedule on running loop if available
        async_cbs = self.async_subscribers.get(event_name, [])
        if async_cbs or self._ws_manager:
            try:
                loop = asyncio.get_running_loop()
                for acb in async_cbs:
                    loop.create_task(acb(payload))
                if self._ws_manager:
                    loop.create_task(self._ws_manager.broadcast(payload))
            except RuntimeError:
                pass  # No running loop (sync context) — skip async dispatch

        logger.debug(f"Event published: {event_name} | {payload}")

    # ── History ───────────────────────────────────────────────

    def get_history(self, event_name: str | None = None, limit: int = 50) -> list:
        """Return recent events, optionally filtered by name."""
        events = list(self.history)
        if event_name:
            events = [e for e in events if e.get("event") == event_name]
        return events[-limit:]

    def get_task_events(self, task_id: str) -> list:
        """Return all events for a specific task."""
        return [e for e in self.history if e.get("task_id") == task_id]


event_bus = EventBus()
