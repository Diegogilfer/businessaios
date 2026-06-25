# ============================================================
# BusinessAIOS - core/security/headers.py
# Middleware de cabeceras de seguridad HTTP (OWASP secure headers)
# ============================================================

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Añade cabeceras de seguridad a todas las respuestas.

    Mitiga clickjacking, MIME-sniffing, fugas de referrer y fuerza HTTPS.
    HSTS solo se emite en producción para no romper desarrollo local en http.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # CSP relajada para que /docs (Swagger UI) siga funcionando
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'none'"
        )

        # HSTS solo en producción (requiere HTTPS real)
        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Eliminar cabecera que delata el stack
        response.headers["Server"] = "BusinessAIOS"

        return response
