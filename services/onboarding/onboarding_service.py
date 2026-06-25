# ============================================================
# BusinessAIOS - services/onboarding/onboarding_service.py
# Onboarding completo: registro → email → activación → guía
# ============================================================

import secrets
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from services.saas.tenant.tenant_manager import tenant_manager
from services.saas.api_keys.api_key_manager import api_key_manager
from services.saas.billing.billing_engine import billing_engine, PLANS
from core.config import settings
from core.logger import get_logger

logger = get_logger("OnboardingService")


class OnboardingService:
    """
    Flujo completo de onboarding para nuevos clientes.

    1. Registro del tenant
    2. Creación de API key
    3. Subscripción al plan seleccionado
    4. Email de bienvenida con instrucciones
    5. Checklist de activación

    Todo en un solo endpoint para que el cliente quede
    listo para usar BusinessAIOS en < 2 minutos.
    """

    async def register_and_onboard(
        self,
        name:    str,
        email:   str,
        plan:    str = "free",
        company: str = "",
    ) -> dict:
        """
        Registro completo con onboarding automático.
        Retorna todo lo que el cliente necesita para empezar.
        """
        logger.info(f"Onboarding started: {email} plan={plan}")

        # 1. Crear tenant
        tenant = await tenant_manager.create_tenant(name, email, plan)
        if not tenant:
            return {"success": False, "error": "Error al crear la cuenta"}

        tid = tenant["tenant_id"]

        # 2. Crear API key
        key_data = await api_key_manager.create_key(tid, "primary")
        api_key  = key_data.get("key", "")

        # 3. Subscripción
        await billing_engine.create_subscription(tid, plan)
        plan_cfg = PLANS.get(plan, PLANS["free"])

        # 4. Email de bienvenida
        email_sent = await self._send_welcome_email(
            to=email, name=name, api_key=api_key,
            plan=plan, tenant_id=tid, company=company,
        )

        # 5. Checklist de activación
        checklist = self._build_checklist(plan)

        result = {
            "success":    True,
            "tenant_id":  tid,
            "api_key":    api_key,
            "plan":       plan,
            "limits":     plan_cfg["limits"],
            "features":   plan_cfg["features"],
            "email_sent": email_sent,
            "checklist":  checklist,
            "next_steps": [
                f"Guarda tu API key: {api_key[:20]}...",
                "Úsala en el header X-API-Key de tus requests",
                "Lee la guía en /docs para ver todos los endpoints",
                "Ejecuta tu primera tarea en POST /tasks",
            ],
            "quick_start": {
                "create_task": f'curl -X POST https://api.businessaios.com/tasks -H "X-API-Key: {api_key}" -d \'{{"title": "Mi primera tarea", "description": "Analiza mi negocio"}}\'',
                "docs_url":   "https://api.businessaios.com/docs",
                "dashboard":  "https://app.businessaios.com",
            },
            "onboarded_at": datetime.utcnow().isoformat(),
        }

        logger.info(f"Onboarding complete: tenant={tid} plan={plan} email_sent={email_sent}")
        return result

    async def _send_welcome_email(
        self, to: str, name: str, api_key: str,
        plan: str, tenant_id: str, company: str = "",
    ) -> bool:
        plan_cfg  = PLANS.get(plan, PLANS["free"])
        plan_name = plan.capitalize()
        limits    = plan_cfg["limits"]

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
<style>
  body {{ font-family: 'IBM Plex Sans', Arial, sans-serif; background: #060606; color: #ccc; margin: 0; padding: 0; }}
  .container {{ max-width: 600px; margin: 40px auto; padding: 0 20px; }}
  .header {{ background: linear-gradient(135deg, #0d0d0d, #111); border: 1px solid #c8f04a22; border-top: 3px solid #c8f04a; border-radius: 4px; padding: 32px; margin-bottom: 24px; text-align: center; }}
  .logo {{ font-size: 32px; color: #c8f04a; margin-bottom: 8px; }}
  .title {{ font-size: 22px; font-weight: 700; color: #eee; margin: 0; letter-spacing: 0.04em; }}
  .subtitle {{ font-size: 13px; color: #555; margin: 6px 0 0; }}
  .card {{ background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 4px; padding: 24px; margin-bottom: 16px; }}
  .card h3 {{ font-size: 12px; color: #c8f04a; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px; }}
  .api-key {{ font-family: monospace; font-size: 13px; color: #4af0c8; background: #0a0a0a; border: 1px solid #1e1e1e; padding: 12px 16px; border-radius: 3px; word-break: break-all; }}
  .plan-badge {{ display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #c8f04a18; color: #c8f04a; border: 1px solid #c8f04a30; }}
  .limit-row {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #111; font-size: 12px; }}
  .limit-val {{ color: #4af0c8; font-family: monospace; }}
  .btn {{ display: inline-block; background: #c8f04a; color: #000; padding: 12px 28px; border-radius: 3px; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; margin: 8px 4px; }}
  .footer {{ text-align: center; font-size: 10px; color: #2a2a2a; padding: 20px 0; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">⬡</div>
    <h1 class="title">BUSINESSAIOS</h1>
    <p class="subtitle">Tu plataforma de inteligencia empresarial con IA</p>
  </div>

  <div class="card">
    <h3>Bienvenido, {name} 👋</h3>
    <p style="font-size:13px;color:#888;line-height:1.7;">
      Tu cuenta está activada en el plan <span class="plan-badge">{plan_name}</span>.
      Tienes acceso a 6 agentes de IA especializados listos para analizar
      tu negocio, crear contenido, proyectar finanzas y encontrar
      oportunidades de arbitraje.
    </p>
  </div>

  <div class="card">
    <h3>Tu API Key</h3>
    <div class="api-key">{api_key}</div>
    <p style="font-size:11px;color:#f04a6c;margin-top:8px;">
      ⚠ Guarda esta clave de forma segura. No se puede recuperar después.
    </p>
  </div>

  <div class="card">
    <h3>Límites de tu plan {plan_name}</h3>
    <div class="limit-row"><span>Tareas por mes</span><span class="limit-val">{limits.get('tasks_per_month', 0) if limits.get('tasks_per_month', 0) != -1 else '∞'}</span></div>
    <div class="limit-row"><span>Chat por día</span><span class="limit-val">{limits.get('chat_messages_per_day', 0) if limits.get('chat_messages_per_day', 0) != -1 else '∞'}</span></div>
    <div class="limit-row"><span>Agentes disponibles</span><span class="limit-val">{limits.get('agents_available', 0)}</span></div>
    <div class="limit-row" style="border:none;"><span>Scans de arbitraje</span><span class="limit-val">{limits.get('arbitrage_scans', 0) if limits.get('arbitrage_scans', 0) != -1 else '∞'}</span></div>
  </div>

  <div class="card" style="text-align:center;">
    <h3>Empieza ahora</h3>
    <a href="https://app.businessaios.com" class="btn">Abrir Dashboard</a>
    <a href="https://api.businessaios.com/docs" class="btn" style="background:#0d0d0d;color:#c8f04a;border:1px solid #c8f04a30;">Ver API Docs</a>
  </div>

  <div class="card">
    <h3>Ejemplo rápido</h3>
    <div class="api-key" style="font-size:11px;">curl -X POST https://api.businessaios.com/tasks \\<br>
  -H "X-API-Key: {api_key[:30]}..." \\<br>
  -H "Content-Type: application/json" \\<br>
  -d '{{"title":"Analiza mi negocio","description":"Soy una agencia de marketing en Cali","category":"strategy"}}'</div>
  </div>

  <div class="footer">
    <p>Tenant ID: {tenant_id}</p>
    <p>¿Preguntas? Responde este email o escribe a diegogilfer.93@gmail.com</p>
    <p>BusinessAIOS · Cali, Colombia</p>
  </div>
</div>
</body>
</html>
"""
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            logger.warning(f"SMTP no configurado — email de bienvenida no enviado a {to}")
            logger.info(f"[DEV] API Key para {to}: {api_key}")
            return False

        try:
            msg              = MIMEMultipart("alternative")
            msg["Subject"]   = f"✓ Tu cuenta BusinessAIOS está activa — Plan {plan_name}"
            msg["From"]      = f"BusinessAIOS <{settings.SMTP_USER}>"
            msg["To"]        = to
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(settings.SMTP_USER, to, msg.as_string())
            logger.info(f"Welcome email sent to {to}")
            return True
        except Exception as e:
            logger.error(f"Email send error: {e}")
            return False

    def _build_checklist(self, plan: str) -> list[dict]:
        base = [
            {"step": 1, "title": "Guardar API Key",         "done": False, "action": "Cópiala y guárdala en un lugar seguro"},
            {"step": 2, "title": "Primera tarea",           "done": False, "action": "POST /tasks con tu primer análisis"},
            {"step": 3, "title": "Abrir el dashboard",      "done": False, "action": "https://app.businessaios.com"},
            {"step": 4, "title": "Chatear con un agente",   "done": False, "action": "Tab 💬 Chat → selecciona Research Agent"},
            {"step": 5, "title": "Instalar un skill",       "done": False, "action": "Tab ◆ Skills → instalar SWOT Analysis"},
        ]
        if plan in ("starter", "pro", "enterprise"):
            base.append({"step": 6, "title": "Configurar webhook", "done": False, "action": "POST /saas/api-keys para obtener más keys"})
        if plan in ("pro", "enterprise"):
            base.append({"step": 7, "title": "Activar Arbitrage Engine", "done": False, "action": "Configurar AMAZON_CLIENT_ID en variables"})
        return base


onboarding_service = OnboardingService()
