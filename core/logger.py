# ============================================================
# BusinessAIOS - core/logger.py
# Structured logging utility
# ============================================================

import logging
import sys
from core.config import settings


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger instance."""
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger  # Already configured

    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # Redacción de secretos: evita que API keys, tokens o JWT lleguen a stdout
    try:
        from core.security.log_filter import SecretRedactionFilter
        handler.addFilter(SecretRedactionFilter())
    except Exception:
        pass

    logger.addHandler(handler)

    return logger
