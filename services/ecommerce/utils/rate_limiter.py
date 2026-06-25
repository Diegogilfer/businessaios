# ============================================================
# BusinessAIOS - services/ecommerce/utils/rate_limiter.py
# Throttle async para llamadas SALIENTES a APIs de terceros
# (Amazon SP-API, AliExpress). Distinto del limitador de
# seguridad (core/security/rate_limiter.py), que protege las
# requests ENTRANTES.
# ============================================================

import time
import asyncio


class RateLimiter:
    """
    Limita el ritmo de peticiones salientes a una API externa.
    Espera (await) lo necesario para no exceder `max_requests`
    en una ventana deslizante de `window_seconds`.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: list[float] = []

    async def wait(self) -> None:
        now = time.time()
        # Descartar timestamps fuera de la ventana
        self.requests = [r for r in self.requests if r > now - self.window_seconds]
        if len(self.requests) >= self.max_requests:
            sleep_time = self.requests[0] + self.window_seconds - now
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
        self.requests.append(time.time())
