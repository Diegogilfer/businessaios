# ============================================================
# BusinessAIOS - services/security/security_agent.py
# SecurityAgent — el guardián del sistema.
#
# Se integra con la arquitectura de agentes (CEO, Research, ...,
# Security). Responsabilidades:
#   1. Auditar la configuración de seguridad en runtime
#   2. Detectar fuerza bruta sobre los endpoints de acceso
#   3. Emitir alertas a la tabla system_alerts
# ============================================================

import time
import threading
from collections import defaultdict, deque
from datetime import datetime

from core.config import settings
from core.logger import get_logger

logger = get_logger("SecurityAgent")

# Default conocido de SECRET_KEY — si sigue así, es un hallazgo crítico
_DEFAULT_SECRET = "businessaios-change-in-production"

# Umbral de fuerza bruta: N intentos fallidos en `window` segundos
_BRUTE_LIMIT  = 5
_BRUTE_WINDOW = 300  # 5 min


class SecurityAgent:
    role = "security"
    name = "Security Agent"
    goal = "Proteger el sistema: auditar configuración, detectar abusos y alertar."

    def __init__(self):
        self._db = None
        self._failed: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    @property
    def db(self):
        if self._db is None:
            try:
                from core.database import get_supabase
                self._db = get_supabase()
            except Exception:
                pass
        return self._db

    # ── 1. Auditoría de configuración ─────────────────────────

    def audit_config(self) -> list[dict]:
        """Revisa settings y devuelve una lista de hallazgos."""
        findings: list[dict] = []

        def add(sev, area, msg, fix):
            findings.append({"severity": sev, "area": area, "message": msg, "fix": fix})

        is_prod = settings.APP_ENV == "production"

        # SECRET_KEY por defecto
        if settings.SECRET_KEY == _DEFAULT_SECRET:
            add("high", "SECRET_KEY",
                "SECRET_KEY usa el valor por defecto.",
                "Genera uno: python -c \"import secrets; print(secrets.token_urlsafe(48))\" y ponlo en .env")

        # ACCESS_KEY ausente
        if not settings.ACCESS_KEY:
            add("high" if is_prod else "medium", "ACCESS_KEY",
                "ACCESS_KEY no configurado — la API está abierta sin autenticación.",
                "Define ACCESS_KEY=BAIOS-XXXX-XXXX-XXXX en .env")

        # DEBUG en producción
        if is_prod and settings.DEBUG:
            add("medium", "DEBUG",
                "DEBUG=true en producción — filtra trazas internas.",
                "Define DEBUG=false en .env de producción")

        # Sin provider de IA
        if not settings.DEEPSEEK_API_KEY and not settings.GEMINI_API_KEY:
            add("high", "LLM",
                "Ningún proveedor de IA configurado.",
                "Define DEEPSEEK_API_KEY o GEMINI_API_KEY en .env")

        # Supabase
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            add("high", "Supabase",
                "Supabase no configurado — sin persistencia ni RLS efectiva.",
                "Define SUPABASE_URL y SUPABASE_KEY en .env")

        # Stripe sin webhook secret
        if settings.STRIPE_SECRET_KEY and not settings.STRIPE_WEBHOOK_SECRET:
            add("medium", "Stripe",
                "STRIPE_SECRET_KEY presente pero falta STRIPE_WEBHOOK_SECRET — webhooks sin verificar.",
                "Define STRIPE_WEBHOOK_SECRET en .env")

        # CORS abierto en producción
        if is_prod and (not settings.ALLOWED_ORIGINS or settings.ALLOWED_ORIGINS.strip() == "*"):
            add("medium", "CORS",
                "CORS permite cualquier origen en producción.",
                "Define ALLOWED_ORIGINS con tu dominio en .env")

        return findings

    # ── 2. Detección de fuerza bruta ──────────────────────────

    def record_failed_auth(self, identifier: str) -> dict:
        """
        Registra un intento de acceso fallido. Devuelve estado de bloqueo.
        `identifier` suele ser la IP del cliente.
        """
        now = time.monotonic()
        with self._lock:
            bucket = self._failed[identifier]
            cutoff = now - _BRUTE_WINDOW
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            bucket.append(now)
            attempts = len(bucket)

        blocked = attempts >= _BRUTE_LIMIT
        if blocked:
            logger.warning(f"Brute-force detectado | id={identifier} intentos={attempts}")
        return {"blocked": blocked, "attempts": attempts, "limit": _BRUTE_LIMIT}

    def reset_failed_auth(self, identifier: str) -> None:
        with self._lock:
            self._failed.pop(identifier, None)

    # ── 3. Alertas ────────────────────────────────────────────

    async def raise_alert(self, severity: str, type_: str, message: str, action: str = "") -> bool:
        """Persiste una alerta de seguridad en system_alerts."""
        if severity not in ("high", "medium", "low", "info"):
            severity = "info"
        if not self.db:
            logger.warning(f"[ALERT/{severity}] {type_}: {message}")
            return False
        try:
            self.db.table("system_alerts").insert({
                "severity":   severity,
                "type":       f"security.{type_}",
                "message":    message,
                "action":     action,
                "resolved":   False,
                "tenant_id":  "default",
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"raise_alert error: {e}")
            return False

    # ── Auditoría completa (config + score) ───────────────────

    async def run_full_audit(self, persist_alerts: bool = False) -> dict:
        findings = self.audit_config()
        highs    = [f for f in findings if f["severity"] == "high"]
        mediums  = [f for f in findings if f["severity"] == "medium"]

        # Score 0-100: cada high -25, cada medium -10
        score = max(0, 100 - 25 * len(highs) - 10 * len(mediums))

        if persist_alerts:
            for f in highs:
                await self.raise_alert("high", f["area"], f["message"], f["fix"])

        return {
            "timestamp":      datetime.utcnow().isoformat(),
            "security_score": score,
            "grade":          self._grade(score),
            "totals":         {"high": len(highs), "medium": len(mediums)},
            "findings":       findings,
            "checks_passed":  not findings,
        }

    @staticmethod
    def _grade(score: int) -> str:
        if score >= 90: return "A"
        if score >= 75: return "B"
        if score >= 60: return "C"
        if score >= 40: return "D"
        return "F"


security_agent = SecurityAgent()
