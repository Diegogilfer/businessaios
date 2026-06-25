# ============================================================
# BusinessAIOS - services/observability/monitor.py
# Observabilidad Enterprise: Sentry + Posthog + Slack + uptime
# ============================================================

import time
import traceback
from datetime import datetime
from core.config import settings
from core.logger import get_logger

logger = get_logger("Monitor")


class ObservabilityMonitor:
    """
    Monitor de observabilidad enterprise.

    Sentry   → captura excepciones y errores en producción
    Posthog  → analytics de uso (qué tabs abren, qué agentes usan)
    Slack    → alertas en tiempo real a tu canal de ops
    Health   → endpoint /health enriquecido para uptime monitors
    """

    def __init__(self):
        self._sentry_ready  = False
        self._posthog_ready = False
        self._slack_url     = ""
        self._init_sentry()
        self._init_posthog()
        self._init_slack()

    # ── Sentry ──────────────────────────────────────────────

    def _init_sentry(self):
        dsn = settings.SENTRY_DSN
        if not dsn:
            return
        try:
            import sentry_sdk
            from sentry_sdk.integrations.asyncio import AsyncioIntegration
            sentry_sdk.init(
                dsn=dsn,
                environment=settings.APP_ENV,
                release="businessaios@1.3.1",
                traces_sample_rate=0.1,
                integrations=[AsyncioIntegration()],
                before_send=self._sentry_filter,
            )
            self._sentry_ready = True
            logger.info("✅ Sentry inicializado")
        except ImportError:
            logger.info("Sentry: pip install sentry-sdk para activar")

    def _sentry_filter(self, event, hint):
        """No enviar errores de dev/config a Sentry."""
        msg = str(event.get("exception", ""))
        if any(s in msg for s in ["test-key", "not configured", "dev_mode"]):
            return None
        return event

    def capture_exception(self, exc: Exception, ctx: dict = None):
        if self._sentry_ready:
            try:
                import sentry_sdk
                with sentry_sdk.push_scope() as scope:
                    if ctx:
                        for k, v in ctx.items():
                            scope.set_extra(k, v)
                    sentry_sdk.capture_exception(exc)
            except Exception:
                pass
        logger.error(f"[EXCEPTION] {exc}\n{traceback.format_exc()[:400]}")

    def capture_message(self, msg: str, level: str = "info"):
        if self._sentry_ready:
            try:
                import sentry_sdk
                sentry_sdk.capture_message(msg, level=level)
            except Exception:
                pass

    # ── Posthog ─────────────────────────────────────────────

    def _init_posthog(self):
        key = settings.POSTHOG_API_KEY
        if not key:
            return
        try:
            from posthog import Posthog
            self._ph = Posthog(
                project_api_key=key,
                host=settings.POSTHOG_HOST,
                disabled=settings.APP_ENV != "production",
            )
            self._posthog_ready = True
            logger.info("✅ Posthog inicializado")
        except ImportError:
            logger.info("Posthog: pip install posthog para activar")

    def track(self, distinct_id: str, event: str, properties: dict = None):
        """Trackear evento de uso (qué hacen los usuarios)."""
        if not self._posthog_ready:
            return
        try:
            self._ph.capture(
                distinct_id=distinct_id or "anonymous",
                event=event,
                properties=properties or {},
            )
        except Exception:
            pass

    def identify_tenant(self, tenant_id: str, properties: dict = None):
        """Identificar tenant en Posthog para segmentación."""
        if not self._posthog_ready:
            return
        try:
            self._ph.identify(
                distinct_id=tenant_id,
                properties=properties or {},
            )
        except Exception:
            pass

    # ── Slack ────────────────────────────────────────────────

    def _init_slack(self):
        url = settings.SLACK_WEBHOOK_URL
        if url:
            self._slack_url   = url
            logger.info("✅ Slack webhook configurado")

    async def alert_slack(self, message: str, level: str = "info",
                          fields: list[dict] = None) -> bool:
        if not self._slack_url:
            return False

        icons  = {"info": "ℹ️", "warning": "⚠️", "error": "🚨", "success": "✅"}
        colors = {"info": "#4af0c8", "warning": "#f0a44a", "error": "#f04a6c", "success": "#c8f04a"}

        payload = {
            "attachments": [{
                "color":  colors.get(level, "#888"),
                "text":   f"{icons.get(level,'ℹ️')} *BusinessAIOS* — {message}",
                "fields": fields or [],
                "footer": f"v1.3.1 | {settings.APP_ENV} | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            }]
        }
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.post(self._slack_url, json=payload)
                return r.status_code == 200
        except Exception as e:
            logger.error(f"Slack error: {e}")
            return False

    async def alert_critical(self, title: str, detail: str):
        """Atajar directamente para alertas críticas."""
        await self.alert_slack(
            message=f"*{title}*\n{detail}",
            level="error",
        )

    # ── Health check ─────────────────────────────────────────

    async def full_health_check(self) -> dict:
        """Health check profundo: DB, LLM, memoria, scheduler."""
        start  = time.time()
        checks: dict = {}

        # Database
        try:
            from core.database import get_supabase
            db = get_supabase()
            db.table("tasks").select("id").limit(1).execute()
            checks["database"] = {"status": "ok",
                                   "latency_ms": round((time.time()-start)*1000)}
        except Exception as e:
            checks["database"] = {"status": "error", "error": str(e)[:80]}

        # LLM provider
        checks["llm"] = {
            "status":   "configured" if (settings.DEEPSEEK_API_KEY or settings.GEMINI_API_KEY) else "missing",
            "provider": settings.DEFAULT_LLM_PROVIDER,
        }

        # Memoria del sistema
        try:
            import psutil
            mem = psutil.virtual_memory()
            checks["memory"] = {
                "status":       "warning" if mem.percent > 85 else "ok",
                "used_percent": round(mem.percent, 1),
                "available_mb": round(mem.available / 1024 / 1024),
            }
        except ImportError:
            checks["memory"] = {"status": "unknown"}

        # Auth
        checks["auth"] = {
            "status":       "protected" if settings.ACCESS_KEY else "open",
            "recovery_set": bool(settings.RECOVERY_EMAIL),
        }

        # Overall
        statuses = [c.get("status") for c in checks.values()]
        overall  = ("degraded" if "error" in statuses
                    else "warning" if "warning" in statuses or "missing" in statuses
                    else "healthy")

        result = {
            "status":      overall,
            "version":     "1.3.1",
            "environment": settings.APP_ENV,
            "checks":      checks,
            "response_ms": round((time.time()-start)*1000),
            "timestamp":   datetime.utcnow().isoformat(),
        }

        # Alertar si degradado
        if overall == "degraded":
            await self.alert_critical(
                "Sistema degradado",
                "\n".join(f"• {k}: {v.get('error','?')}"
                          for k, v in checks.items() if v.get("status") == "error")
            )

        return result

    # ── Request metrics ──────────────────────────────────────

    def record_request(self, path: str, method: str,
                       status_code: int, duration_ms: float,
                       tenant_id: str = ""):
        """Registra métricas de cada request para análisis."""
        if status_code >= 500:
            logger.error(f"5xx: {method} {path} → {status_code} ({duration_ms:.1f}ms)")
            self.capture_message(f"5xx: {method} {path}", level="error")
        elif duration_ms > 8000:
            logger.warning(f"Slow: {method} {path} → {duration_ms:.1f}ms")

        # Track en Posthog
        if tenant_id:
            self.track(tenant_id, "api_request", {
                "path":     path,
                "method":   method,
                "status":   status_code,
                "duration": duration_ms,
            })

    def status(self) -> dict:
        return {
            "sentry":  self._sentry_ready,
            "posthog": self._posthog_ready,
            "slack":   bool(self._slack_url),
        }


monitor = ObservabilityMonitor()
