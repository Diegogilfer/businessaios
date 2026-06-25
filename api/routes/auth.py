# ============================================================
# BusinessAIOS - api/routes/auth.py
# Endpoints de autenticación y recuperación de contraseña
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from core.auth import (
    generate_access_key, verify_access_key,
    request_password_recovery, reset_password,
)
from core.config import settings
from core.logger import get_logger

router = APIRouter(prefix="/auth", tags=["Auth & Acceso"])
logger = get_logger("AuthRouter")


class VerifyRequest(BaseModel):
    key: str

class RecoverRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    token:   str
    new_key: str


@router.post("/verify", summary="Verificar clave de acceso")
async def verify_key(data: VerifyRequest):
    """
    Verifica si una clave de acceso es válida.
    Retorna 200 si es correcta, 403 si no.
    """
    if verify_access_key(data.key):
        return {
            "valid":   True,
            "message": "Clave válida — acceso autorizado",
            "system":  "BusinessAIOS v1.0.0",
        }
    raise HTTPException(403, "Clave inválida")


@router.post("/recover-password", summary="★ Solicitar recuperación de contraseña")
async def recover_password(data: RecoverRequest):
    """
    Inicia el proceso de recuperación de clave.

    **Solo funciona con el email de respaldo registrado.**

    El sistema enviará un token de recuperación de 15 minutos.
    Si SMTP no está configurado, el token se imprime en la consola del servidor.

    Email de respaldo: diegogilfer.93@gmail.com
    """
    return request_password_recovery(data.email)


@router.post("/reset-password", summary="Establecer nueva clave con token")
async def reset_key(data: ResetRequest):
    """
    Establece una nueva clave usando el token recibido por email.

    Formato requerido: BAIOS-XXXX-XXXX-XXXX

    Después de usar este endpoint, actualiza ACCESS_KEY en tu .env.
    """
    return reset_password(data.token, data.new_key)


@router.get("/generate-key", summary="Generar una clave nueva (solo desarrollo)")
async def gen_key():
    """
    Genera una clave de acceso en formato BAIOS-XXXX-XXXX-XXXX.
    Úsala para configurar ACCESS_KEY en tu .env.

    ⚠️ Este endpoint estará deshabilitado en producción.
    """
    if settings.APP_ENV == "production":
        raise HTTPException(404, "No disponible en producción")

    key = generate_access_key()
    return {
        "key":      key,
        "format":   "BAIOS-XXXX-XXXX-XXXX",
        "next_step": f"Agrega ACCESS_KEY={key} en tu archivo .env",
    }


@router.get("/status", summary="Estado del sistema de acceso")
async def auth_status():
    return {
        "access_key_configured": bool(settings.ACCESS_KEY),
        "recovery_email":        settings.RECOVERY_EMAIL,
        "mode":                  "protected" if settings.ACCESS_KEY else "open (dev)",
        "provider":              settings.DEFAULT_LLM_PROVIDER,
    }
