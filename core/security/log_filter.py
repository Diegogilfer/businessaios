# ============================================================
# BusinessAIOS - core/security/log_filter.py
# Filtro de logging que redacta secretos antes de que toquen disco/stdout
# ============================================================

import logging
import re

# Patrones de secretos comunes. Cada uno conserva un prefijo identificable
# y enmascara el resto para que el log siga siendo útil sin filtrar la clave.
_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Bearer / Authorization
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/]{8,}=*", re.IGNORECASE), r"\1••••REDACTED"),
    # API keys del sistema
    (re.compile(r"(bios_live_)[A-Za-z0-9\-_]{6,}"), r"\1••••REDACTED"),
    (re.compile(r"(BAIOS-)[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}"), r"\1••••-••••-••••"),
    # OpenAI / DeepSeek style
    (re.compile(r"(sk-)[A-Za-z0-9]{8,}"), r"\1••••REDACTED"),
    # Stripe
    (re.compile(r"(sk_live_|sk_test_|rk_live_|whsec_)[A-Za-z0-9]{6,}"), r"\1••••REDACTED"),
    # JWT (tres segmentos base64url)
    (re.compile(r"eyJ[A-Za-z0-9\-_]{6,}\.[A-Za-z0-9\-_]{6,}\.[A-Za-z0-9\-_]{6,}"), "••••JWT_REDACTED"),
    # Pares clave=valor sensibles (password, token, secret, api_key, key)
    (re.compile(r"(?i)\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\b\s*[=:]\s*['\"]?[^\s'\";,}]{4,}", ), r"\1=••••REDACTED"),
]


class SecretRedactionFilter(logging.Filter):
    """Redacta secretos en el mensaje y los args de cada LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
            redacted = self._redact(msg)
            if redacted != msg:
                record.msg = redacted
                record.args = ()  # ya interpolado en record.msg
        except Exception:
            # Nunca dejar que el filtro rompa el logging
            pass
        return True

    @staticmethod
    def _redact(text: str) -> str:
        for pattern, repl in _PATTERNS:
            text = pattern.sub(repl, text)
        return text


def install_log_redaction() -> None:
    """
    Instala el filtro de redacción en el root logger y en todos los
    handlers existentes. Idempotente.
    """
    f = SecretRedactionFilter()
    root = logging.getLogger()
    if not any(isinstance(flt, SecretRedactionFilter) for flt in root.filters):
        root.addFilter(f)
    for handler in root.handlers:
        if not any(isinstance(flt, SecretRedactionFilter) for flt in handler.filters):
            handler.addFilter(f)
