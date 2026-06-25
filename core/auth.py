# ============================================================
# BusinessAIOS - core/auth.py
# Sistema de acceso con clave única + recuperación por email
# ============================================================

import hashlib
import hmac
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import HTTPException, Header, Depends
from core.config import settings
from core.logger import get_logger

logger = get_logger("Auth")

# ── Almacén de tokens de recuperación ───────────────────────
# Persistidos en Supabase (tabla recovery_tokens) con el HASH del
# token, nunca el token en claro. Fallback a memoria si la DB no
# está disponible, para no bloquear el flujo en desarrollo.
_recovery_tokens: dict[str, dict] = {}   # fallback: {token_hash: {...}}


def _token_hash(token: str) -> str:
    """SHA-256 del token de recuperación, para guardar/buscar sin exponerlo."""
    return hashlib.sha256(token.encode()).hexdigest()


def _recovery_db():
    """Cliente Supabase si está disponible, si no None (usa fallback memoria)."""
    try:
        from core.database import get_supabase
        return get_supabase()
    except Exception:
        return None


def generate_access_key(seed: str = "") -> str:
    """
    Genera una clave de acceso única legible.
    Formato: BAIOS-XXXX-XXXX-XXXX (fácil de recordar, difícil de adivinar)
    """
    base    = seed or secrets.token_hex(12)
    digest  = hashlib.sha256(base.encode()).hexdigest()
    # Tomar 12 caracteres alfanuméricos del hash y formatear
    chars   = digest[:12].upper()
    key     = f"BAIOS-{chars[0:4]}-{chars[4:8]}-{chars[8:12]}"
    return key


def hash_key(key: str) -> str:
    """Hash de la clave para almacenamiento seguro."""
    return hashlib.sha256(
        (key + settings.SECRET_KEY).encode()
    ).hexdigest()


def verify_access_key(provided_key: str) -> bool:
    """
    Verifica que la clave proporcionada sea correcta.
    Comparación de tiempo constante para evitar timing attacks.
    """
    if not settings.ACCESS_KEY:
        # Sin clave configurada: modo desarrollo libre
        logger.warning("ACCESS_KEY no configurado — acceso libre (modo dev)")
        return True

    provided_clean = provided_key.strip().upper()
    stored_clean   = settings.ACCESS_KEY.strip().upper()
    return hmac.compare_digest(provided_clean, stored_clean)


# ── FastAPI Dependency ───────────────────────────────────────

async def require_access(
    x_access_key: Optional[str] = Header(None, alias="X-Access-Key"),
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Dependency de FastAPI que verifica la clave de acceso.

    El cliente puede enviarla de dos formas:
      - Header:  X-Access-Key: BAIOS-XXXX-XXXX-XXXX
      - Bearer:  Authorization: Bearer BAIOS-XXXX-XXXX-XXXX
    """
    # Sin clave configurada: modo dev libre
    if not settings.ACCESS_KEY:
        return "dev_mode"

    key = None
    if x_access_key:
        key = x_access_key
    elif authorization and authorization.startswith("Bearer "):
        key = authorization.split(" ", 1)[1]

    if not key:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "Acceso denegado",
                "message": "Debes incluir tu clave de acceso.",
                "how": "Agrega el header X-Access-Key: TU_CLAVE o Authorization: Bearer TU_CLAVE",
                "recover": "Si olvidaste tu clave, usa POST /auth/recover-password",
            }
        )

    if not verify_access_key(key):
        logger.warning(f"Intento de acceso con clave inválida")
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Clave incorrecta",
                "message": "La clave de acceso no es válida.",
                "recover": "Si olvidaste tu clave, usa POST /auth/recover-password",
            }
        )

    return key


# ── Recuperación de contraseña ───────────────────────────────

def _send_recovery_email(token: str, recovery_email: str) -> bool:
    """
    Envía el token de recuperación al email de respaldo.
    Usa SMTP de Gmail con contraseña de aplicación.
    Si no hay SMTP configurado, loguea el token para desarrollo.
    """
    subject  = "BusinessAIOS — Recuperación de clave de acceso"
    body     = f"""
Hola Diego,

Recibiste este email porque solicitaste recuperar tu clave de acceso a BusinessAIOS.

Tu token de recuperación (válido por 15 minutos):

    {token}

Para establecer una nueva clave, haz una petición a:

    POST http://localhost:8000/auth/reset-password
    Body: {{"token": "{token}", "new_key": "BAIOS-XXXX-XXXX-XXXX"}}

Si no solicitaste esto, ignora este email.

— BusinessAIOS v{settings.APP_VERSION}
    """

    smtp_host = getattr(settings, "SMTP_HOST", "") or ""
    smtp_user = getattr(settings, "SMTP_USER", "") or ""
    smtp_pass = getattr(settings, "SMTP_PASS", "") or ""

    if not smtp_host or not smtp_user:
        # Modo dev: loguear el token en consola
        logger.warning("═" * 60)
        logger.warning("⚠️  SMTP no configurado — TOKEN DE RECUPERACIÓN:")
        logger.warning(f"    Token:  {token}")
        logger.warning(f"    Email:  {recovery_email}")
        logger.warning("    Configura SMTP_HOST/SMTP_USER/SMTP_PASS en .env")
        logger.warning("═" * 60)
        return True   # En dev, consideramos exitoso

    try:
        msg               = MIMEMultipart()
        msg["From"]       = smtp_user
        msg["To"]         = recovery_email
        msg["Subject"]    = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recovery_email, msg.as_string())

        logger.info(f"Email de recuperación enviado a {recovery_email}")
        return True
    except Exception as e:
        logger.error(f"Error enviando email de recuperación: {e}")
        return False


def request_password_recovery(email: str) -> dict:
    """
    Inicia el proceso de recuperación.
    SOLO funciona si el email coincide con RECOVERY_EMAIL.
    """
    if email.lower().strip() != settings.RECOVERY_EMAIL.lower().strip():
        # No revelar si el email existe o no (seguridad)
        return {
            "message": "Si el email está registrado, recibirás instrucciones de recuperación.",
            "hint":    "Revisa tu bandeja de entrada y spam.",
        }

    # Generar token de uso único
    token     = secrets.token_urlsafe(32)
    expires   = datetime.utcnow() + timedelta(minutes=15)
    th        = _token_hash(token)

    # Persistir el HASH del token (DB preferida, memoria como fallback)
    db = _recovery_db()
    if db:
        try:
            db.table("recovery_tokens").insert({
                "token_hash": th,
                "email":      email.lower().strip(),
                "expires_at": expires.isoformat(),
                "used":       False,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"No se pudo persistir token de recuperación: {e}")
            _recovery_tokens[th] = {"expires": expires, "used": False}
    else:
        _recovery_tokens[th] = {"expires": expires, "used": False}

    sent = _send_recovery_email(token, email)

    return {
        "message":  "Si el email está registrado, recibirás instrucciones de recuperación.",
        "hint":     "Revisa tu bandeja de entrada y spam.",
        "dev_note": "Token logueado en consola del servidor (SMTP no configurado)" if not sent else None,
    }


def reset_password(token: str, new_key: str) -> dict:
    """
    Establece una nueva clave de acceso usando el token de recuperación.
    Verifica el token contra Supabase (o memoria como fallback).
    """
    th = _token_hash(token)
    db = _recovery_db()
    now = datetime.utcnow()

    # ── Validación del token ──────────────────────────────────
    if db:
        try:
            r = (db.table("recovery_tokens").select("*")
                 .eq("token_hash", th).limit(1).execute())
            record = r.data[0] if r.data else None
        except Exception as e:
            logger.error(f"Error consultando recovery_tokens: {e}")
            record = None
        if not record:
            raise HTTPException(403, "Token inválido o expirado")
        if record.get("used"):
            raise HTTPException(403, "Este token ya fue utilizado")
        if now > datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None):
            raise HTTPException(403, "Token expirado — solicita uno nuevo")
    else:
        record = _recovery_tokens.get(th)
        if not record:
            raise HTTPException(403, "Token inválido o expirado")
        if record["used"]:
            raise HTTPException(403, "Este token ya fue utilizado")
        if now > record["expires"]:
            del _recovery_tokens[th]
            raise HTTPException(403, "Token expirado — solicita uno nuevo")

    # Validar formato de la nueva clave
    new_key_clean = new_key.strip().upper()
    if not new_key_clean.startswith("BAIOS-") or len(new_key_clean) != 19:
        raise HTTPException(400, {
            "error":   "Formato inválido",
            "message": "La clave debe tener el formato BAIOS-XXXX-XXXX-XXXX",
            "example": generate_access_key(),
        })

    # Marcar token como usado
    if db:
        try:
            db.table("recovery_tokens").update(
                {"used": True, "used_at": now.isoformat()}
            ).eq("token_hash", th).execute()
        except Exception as e:
            logger.error(f"No se pudo marcar token como usado: {e}")
    else:
        _recovery_tokens[th]["used"] = True

    # Actualizar en settings (en memoria — el usuario debe actualizar .env manualmente)
    settings.ACCESS_KEY = new_key_clean

    logger.info("✅ Clave de acceso actualizada via token de recuperación")

    return {
        "success": True,
        "message": "Clave actualizada correctamente.",
        "new_key": new_key_clean,
        "warning": "Actualiza ACCESS_KEY en tu archivo .env para que persista después de reiniciar el servidor.",
        "env_line": f"ACCESS_KEY={new_key_clean}",
    }
