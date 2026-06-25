# ============================================================
# BusinessAIOS - core/security/rate_limiter.py
# Rate limiter sliding-window en memoria — sin dependencias externas
# Protege contra brute-force y abuso de endpoints.
# ============================================================

import time
import threading
from collections import defaultdict, deque
from core.logger import get_logger

logger = get_logger("RateLimiter")


class RateLimiter:
    """
    Limitador sliding-window thread-safe, en memoria.

    Para una sola instancia de uvicorn es suficiente. En despliegue
    multi-worker o multi-nodo, reemplazar el backend por Redis
    (la interfaz `hit()` se mantiene igual).

    Uso:
        limiter = RateLimiter()
        allowed, retry_after = limiter.hit("auth:1.2.3.4", limit=5, window=60)
        if not allowed:
            raise HTTPException(429, ...)
    """

    def __init__(self):
        # clave -> deque[timestamps]
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_gc = time.monotonic()

    def hit(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Registra un acceso para `key`.

        Args:
            key:    identificador (ej. "auth:<ip>" o "global:<ip>")
            limit:  número máximo de accesos permitidos en la ventana
            window: tamaño de la ventana en segundos

        Returns:
            (allowed, retry_after_seconds)
        """
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[key]

            # Descartar accesos fuera de la ventana
            cutoff = now - window
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = int(window - (now - bucket[0])) + 1
                return False, max(retry_after, 1)

            bucket.append(now)

            # Garbage collection ocasional para no crecer indefinidamente
            if now - self._last_gc > 300:
                self._gc(now)
                self._last_gc = now

            return True, 0

    def _gc(self, now: float) -> None:
        """Elimina buckets vacíos o totalmente vencidos (ventana máx. 1h)."""
        stale = [k for k, b in self._hits.items() if not b or b[-1] <= now - 3600]
        for k in stale:
            del self._hits[k]
        if stale:
            logger.debug(f"RateLimiter GC: {len(stale)} buckets liberados")

    def reset(self, key: str) -> None:
        """Limpia el contador de una clave (ej. tras login exitoso)."""
        with self._lock:
            self._hits.pop(key, None)


# Singleton compartido por toda la app
rate_limiter = RateLimiter()
