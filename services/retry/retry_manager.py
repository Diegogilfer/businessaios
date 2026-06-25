# ============================================================
# BusinessAIOS - services/retry/retry_manager.py
# UPGRADED: async support + event publishing on retry
# ============================================================

import asyncio
import time
from core.logger import get_logger

logger = get_logger("RetryManager")


class RetryManager:
    """
    Sync + async retry with exponential backoff.
    Publishes TASK_RETRYING events so WebSocket clients see retries.
    """

    @staticmethod
    def execute(func, retries: int = 3, task_id: str | None = None):
        """Sync retry wrapper."""
        last_error = None
        for attempt in range(retries):
            try:
                return func()
            except Exception as e:
                last_error = e
                wait = 2 ** attempt
                logger.warning(f"Retry {attempt+1}/{retries} in {wait}s: {e}")
                time.sleep(wait)
        raise last_error

    @staticmethod
    async def execute_async(coro_func, retries: int = 3, task_id: str | None = None, **kwargs):
        """Async retry wrapper with event publishing."""
        from services.events.event_bus import event_bus
        from services.events.event_types import EventType

        last_error = None
        for attempt in range(retries):
            try:
                return await coro_func(**kwargs)
            except Exception as e:
                last_error = e
                wait = 2 ** attempt
                logger.warning(f"Async retry {attempt+1}/{retries} in {wait}s: {e}")
                if task_id:
                    event_bus.publish(EventType.TASK_RETRYING, {
                        "task_id": task_id,
                        "attempt": attempt + 1,
                        "max_retries": retries,
                        "error": str(e),
                    })
                await asyncio.sleep(wait)
        raise last_error
