# ============================================================
# BusinessAIOS - api/routes/security.py
# Endpoints del SecurityAgent: estado, auditoría y alertas
# ============================================================

from fastapi import APIRouter
from services.security.security_agent import security_agent
from core.config import settings
from core.logger import get_logger

router = APIRouter(prefix="/security", tags=["Security"])
logger = get_logger("SecurityRouter")


@router.get("/status", summary="Estado de seguridad (resumen rápido)")
async def security_status():
    """Resumen de seguridad sin exponer secretos."""
    return {
        "access_protected":  bool(settings.ACCESS_KEY),
        "secret_key_custom": settings.SECRET_KEY != "businessaios-change-in-production",
        "rls":               "enabled",     # forzado a nivel DB
        "api_keys_hashed":   True,
        "log_redaction":     True,
        "security_headers":  True,
        "env":               settings.APP_ENV,
    }


@router.get("/audit", summary="★ Auditoría completa de configuración")
async def security_audit():
    """
    Ejecuta el SecurityAgent y devuelve hallazgos + score (0-100).
    No persiste alertas (modo lectura).
    """
    return await security_agent.run_full_audit(persist_alerts=False)


@router.post("/audit/run", summary="Auditar y registrar alertas críticas")
async def security_audit_run():
    """Igual que /audit pero persiste los hallazgos 'high' en system_alerts."""
    result = await security_agent.run_full_audit(persist_alerts=True)
    logger.info(f"Auditoría ejecutada | score={result['security_score']} grade={result['grade']}")
    return result
