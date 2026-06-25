# ============================================================
# BusinessAIOS - main.py v1.3.0
# PRODUCTION READY — All features, all routes
# ============================================================

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from core.config import settings
from services.observability.monitor import monitor
from core.auth import verify_access_key
from core.logger import get_logger

# All routes
from api.routes import (
    tasks, agents, projects, knowledge, delegation,
    websocket, queue, autonomous, metrics, rag, scraping, arbitrage,
    webhooks, scheduling, analytics, saas, dashboard, chat, auth, growth, neuro, skills,
    onboarding, observability, channels, security
)

logger = get_logger("BusinessAIOS")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────
    logger.info("╔═══════════════════════════════════════════════════════╗")
    logger.info(f"║   BusinessAIOS v{settings.APP_VERSION} — PRODUCTION READY             ║")
    logger.info("║   Autonomous Business Intelligence OS                ║")
    logger.info("╚═══════════════════════════════════════════════════════╝")

    errors = settings.validate()
    if errors:
        logger.warning(f"Config warnings: {errors}")

    # ── Seguridad: redacción de logs + auditoría de arranque ───
    from core.security.log_filter import install_log_redaction
    install_log_redaction()

    from services.security.security_agent import security_agent
    audit = await security_agent.run_full_audit(persist_alerts=True)
    logger.info(f"🛡️  Security score: {audit['security_score']}/100 (grade {audit['grade']}) "
                f"| high={audit['totals']['high']} medium={audit['totals']['medium']}")
    for f in audit["findings"]:
        logger.warning(f"🛡️  [{f['severity'].upper()}] {f['area']}: {f['message']}")

    from services.events.event_bus import event_bus
    from services.events.subscribers import register_default_subscribers
    register_default_subscribers(event_bus)

    from services.websocket.ws_manager import ws_manager
    event_bus.register_ws_manager(ws_manager)

    from services.queue.task_queue import task_queue
    task_queue.start()

    from services.browser.browser_executor import browser_executor
    await browser_executor.launch(headless=True)

    from services.scheduling.scheduler import start_scheduler
    start_scheduler()

    event_bus.publish("system.startup", {"version": settings.APP_VERSION})

    logger.info("✅ AUTONOMOUS LOOP — Think→Plan→Execute→Tool→Verify→Learn")
    logger.info("✅ RAG + SEMANTIC SEARCH — Gemini embeddings + pgvector")
    logger.info("✅ TOOL INVOCATION — 5 tools ready to use")
    logger.info("✅ BROWSER AUTOMATION — Playwright + anti-bot recovery")
    logger.info("✅ ARBITRAGE INTELLIGENCE — Amazon + AliExpress scanning")
    logger.info("✅ NEUROPROFILE LEARNING — Trend prediction + seasonality")
    logger.info("✅ SCHEDULING — Daily automated scans @ 2 AM UTC")
    logger.info("✅ WEBHOOKS — Real-time notifications (persisted)")
    logger.info("✅ ANALYTICS — System health + metrics")
    logger.info("✅ MULTI-TENANT SaaS — Isolation + API keys + billing")
    logger.info("✅ DASHBOARD API — Ready for frontend")
    logger.info("✅ WEBSOCKET STREAMING — Live updates")
    logger.info(f"📚 Docs: http://{settings.APP_HOST}:{settings.APP_PORT}/docs")

    yield  # ── aplicación corre aquí ─────────────────────────

    # ── Shutdown ───────────────────────────────────────────────
    from services.queue.task_queue import task_queue as tq
    tq.stop()

    from services.browser.browser_executor import browser_executor as be
    await be.close()

    from services.scheduling.scheduler import scheduler
    if scheduler.running:
        scheduler.shutdown()

    logger.info("✅ BusinessAIOS shutdown complete")


app = FastAPI(
    title="BusinessAIOS v1.3.0",
    description=(
        "🚀 PRODUCTION-READY Autonomous Business Intelligence OS\n\n"
        "✅ Autonomous Loop | ✅ RAG + Semantic Search | ✅ Tool Invocation\n"
        "✅ Browser Automation | ✅ Arbitrage Intelligence | ✅ NeuroProfile Learning\n"
        "✅ Event-Driven | ✅ WebSocket Streaming | ✅ Task Queue | ✅ Scheduling\n"
        "✅ Webhooks | ✅ Analytics | ✅ Multi-Tenant SaaS | ✅ Dashboard API\n\n"
        "Ready to deploy. Ready to monetize."
    ),
    version="1.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — en producción usa ALLOWED_ORIGINS del .env
_origins = (
    settings.ALLOWED_ORIGINS.split(",")
    if settings.ALLOWED_ORIGINS and settings.APP_ENV == "production"
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"],
)

# Cabeceras de seguridad (HSTS, X-Frame-Options, CSP, etc.)
from core.security.headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)

# ── Include all routers ────────────────────────────────────
app.include_router(tasks.router)
app.include_router(agents.router)
app.include_router(projects.router)
app.include_router(knowledge.router)
app.include_router(delegation.router)
app.include_router(websocket.router)
app.include_router(queue.router)
app.include_router(autonomous.router)
app.include_router(metrics.router)
app.include_router(rag.router)
app.include_router(scraping.router)
app.include_router(arbitrage.router)
app.include_router(webhooks.router)
app.include_router(scheduling.router)
app.include_router(analytics.router)
app.include_router(saas.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(growth.router)
app.include_router(neuro.router)
app.include_router(skills.router)
app.include_router(onboarding.router)
app.include_router(observability.router)
app.include_router(channels.router)
app.include_router(security.router)


# ── Startup ────────────────────────────────────────────────
# ── Auth Middleware ────────────────────────────────────────
from fastapi import Request
from fastapi.responses import JSONResponse

OPEN_PATHS = {"/docs", "/redoc", "/openapi.json", "/auth/verify",
              "/auth/recover-password", "/auth/reset-password",
              "/auth/generate-key", "/auth/status", "/health",
              "/onboarding/register", "/onboarding/plans", "/onboarding/health",
              "/observability/health",
              "/channels/whatsapp/webhook", "/channels/telegram/webhook"}

# Endpoints sensibles a fuerza bruta — límite estricto por IP
AUTH_SENSITIVE = {"/auth/verify", "/auth/recover-password",
                  "/auth/reset-password", "/onboarding/register"}


def _client_ip(request: Request) -> str:
    """IP real del cliente, respetando proxy inverso (X-Forwarded-For)."""
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    from core.security.rate_limiter import rate_limiter
    from services.security.security_agent import security_agent

    path = request.url.path
    ip   = _client_ip(request)

    # ── Rate limit estricto en endpoints de acceso (anti brute-force) ──
    if path in AUTH_SENSITIVE:
        allowed, retry = rate_limiter.hit(f"authsens:{ip}", limit=8, window=300)
        if not allowed:
            await security_agent.raise_alert(
                "high", "brute_force",
                f"Posible fuerza bruta en {path} desde {ip}",
                "Revisa logs y considera bloquear la IP",
            )
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry)},
                content={"error": "Demasiados intentos", "retry_after_seconds": retry},
            )

    # ── Rate limit global por IP (protección de abuso general) ──
    if not path.startswith("/ws"):
        allowed, retry = rate_limiter.hit(f"global:{ip}", limit=300, window=60)
        if not allowed:
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry)},
                content={"error": "Rate limit excedido", "retry_after_seconds": retry},
            )

    # Rutas públicas sin autenticación
    if path in OPEN_PATHS or path.startswith("/ws"):
        return await call_next(request)

    # Si no hay ACCESS_KEY configurado: modo desarrollo abierto
    if not settings.ACCESS_KEY:
        return await call_next(request)

    # Verificar clave
    key = request.headers.get("X-Access-Key") or ""
    if not key:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            key = auth_header.split(" ", 1)[1]

    if not key or not verify_access_key(key):
        bf = security_agent.record_failed_auth(ip)
        if bf["blocked"]:
            await security_agent.raise_alert(
                "high", "brute_force",
                f"{bf['attempts']} accesos inválidos desde {ip}",
                "Revisa logs y considera bloquear la IP",
            )
        return JSONResponse(
            status_code=401,
            content={
                "error":   "Acceso no autorizado",
                "message": "Incluye tu clave en el header X-Access-Key: BAIOS-XXXX-XXXX-XXXX",
                "recover": "¿Olvidaste tu clave? POST /auth/recover-password",
                "docs":    "Accede sin clave a: /docs",
            }
        )

    # Acceso válido: limpiar contador de fallos de esa IP
    security_agent.reset_failed_auth(ip)
    return await call_next(request)


# ── Root endpoints ─────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {
        "name": f"BusinessAIOS v{settings.APP_VERSION}",
        "status": "🚀 PRODUCTION READY",
        "tagline": "Autonomous Business Intelligence OS",
        "endpoints": {
            "api_docs": "/docs",
            "arbitrage": "/arbitrage/scan",
            "dashboard": "/dashboard/overview",
            "saas": "/saas/status",
            "webhooks": "/webhooks/events",
            "analytics": "/analytics/health",
            "scheduler": "/scheduling/status",
        },
        "features": [
            "Autonomous Execution Loop",
            "RAG + Semantic Search",
            "Tool Invocation System",
            "Browser Automation",
            "Cross-Border Arbitrage",
            "NeuroProfile Learning",
            "Daily Scheduling",
            "Webhook Notifications",
            "System Analytics",
            "Multi-Tenant SaaS",
            "Dashboard API",
            "Real-time Streaming",
        ]
    }


@app.get("/health", tags=["System"])
async def health():
    from core.database import get_supabase
    from services.queue.task_queue import task_queue
    from services.browser.browser_executor import browser_executor
    from services.scheduling.scheduler import scheduler
    from services.analytics.analytics_engine import analytics_engine

    try:
        db = get_supabase()
        db.table("tasks").select("id").limit(1).execute()
        db_status = "✅"
    except:
        db_status = "❌"

    system_health = await analytics_engine.get_system_health()

    return {
        "status": "healthy" if db_status == "✅" else "degraded",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "gemini_api": "✅" if settings.GEMINI_API_KEY else "⚠️",
            "browser": "✅" if browser_executor.browser else "⚠️",
            "queue": "✅",
            "scheduler": "✅ ACTIVE" if scheduler.running else "⚠️",
        },
        "health_score": system_health.get("health_score"),
        "uptime": "Running",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=settings.DEBUG)
