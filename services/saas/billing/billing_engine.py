# ============================================================
# BusinessAIOS - services/saas/billing/billing_engine.py
# FASE 11 — Billing completo con Stripe + quotas + enforcement
# ============================================================

import stripe
from datetime import datetime, timedelta
from enum import Enum
from core.config import settings
from core.logger import get_logger
from core.database import get_supabase

logger = get_logger("BillingEngine")

# ── Planes y límites ─────────────────────────────────────────
PLANS: dict[str, dict] = {
    "free": {
        "price_monthly":    0,
        "stripe_price_id":  "",
        "limits": {
            "tasks_per_month":       50,
            "executions_per_month":  50,
            "chat_messages_per_day": 20,
            "agents_available":      3,   # ceo, research, commercial
            "arbitrage_scans":       0,
            "knowledge_entries":     100,
            "api_keys":              1,
        },
        "features": ["basic_agents", "task_execution", "chat"],
    },
    "starter": {
        "price_monthly":   29,
        "stripe_price_id": "",          # set STRIPE_PRICE_STARTER in .env
        "limits": {
            "tasks_per_month":       500,
            "executions_per_month":  500,
            "chat_messages_per_day": 200,
            "agents_available":      6,
            "arbitrage_scans":       5,
            "knowledge_entries":     1000,
            "api_keys":              3,
        },
        "features": ["all_agents", "arbitrage", "rag_search", "webhooks"],
    },
    "pro": {
        "price_monthly":   99,
        "stripe_price_id": "",          # set STRIPE_PRICE_PRO in .env
        "limits": {
            "tasks_per_month":       5000,
            "executions_per_month":  5000,
            "chat_messages_per_day": -1,  # ilimitado
            "agents_available":      6,
            "arbitrage_scans":       50,
            "knowledge_entries":     -1,
            "api_keys":              10,
        },
        "features": ["all_agents", "arbitrage", "rag_search", "webhooks",
                     "scheduling", "analytics", "personality_engine"],
    },
    "enterprise": {
        "price_monthly":   None,        # contacto directo
        "stripe_price_id": "",
        "limits": {
            "tasks_per_month":       -1,
            "executions_per_month":  -1,
            "chat_messages_per_day": -1,
            "agents_available":      6,
            "arbitrage_scans":       -1,
            "knowledge_entries":     -1,
            "api_keys":              -1,
        },
        "features": ["everything", "custom_agents", "sla", "dedicated_support"],
    },
}


class BillingEngine:

    def __init__(self):
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None
        if settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            self._stripe_ready = True
        else:
            self._stripe_ready = False
            logger.warning("Stripe no configurado — billing en modo local")

    # ── Subscriptions ────────────────────────────────────────

    async def create_subscription(self, tenant_id: str, plan: str) -> dict:
        plan_cfg = PLANS.get(plan, PLANS["free"])
        now      = datetime.utcnow()
        record   = {
            "tenant_id":         tenant_id,
            "plan":              plan,
            "status":            "active",
            "start_date":        now.isoformat(),
            "next_billing_date": (now + timedelta(days=30)).isoformat(),
            "amount":            plan_cfg["price_monthly"] or 0,
            "created_at":        now.isoformat(),
        }
        try:
            self.db.table("subscriptions").insert(record).execute()
            logger.info(f"Subscription created: tenant={tenant_id} plan={plan}")
        except Exception as e:
            logger.error(f"Subscription DB error: {e}")
        return {"plan": plan, "status": "active", "limits": plan_cfg["limits"]}

    async def get_subscription(self, tenant_id: str) -> dict | None:
        try:
            r = (self.db.table("subscriptions").select("*")
                 .eq("tenant_id", tenant_id).eq("status", "active")
                 .order("created_at", desc=True).limit(1).execute())
            if not r.data:
                return None
            sub  = r.data[0]
            plan = sub["plan"]
            return {**sub, "limits": PLANS.get(plan, PLANS["free"])["limits"],
                    "features": PLANS.get(plan, PLANS["free"])["features"]}
        except Exception as e:
            logger.error(f"get_subscription error: {e}")
            return None

    async def upgrade_plan(self, tenant_id: str, new_plan: str) -> dict:
        if new_plan not in PLANS:
            return {"success": False, "error": f"Plan inválido: {new_plan}. Opciones: {list(PLANS.keys())}"}
        try:
            # Cancelar sub activa
            self.db.table("subscriptions").update({"status": "cancelled"}).eq("tenant_id", tenant_id).eq("status", "active").execute()
            # Crear nueva
            result = await self.create_subscription(tenant_id, new_plan)
            # Actualizar plan en tenant
            self.db.table("tenants").update({"plan": new_plan}).eq("id", tenant_id).execute()
            logger.info(f"Plan upgraded: tenant={tenant_id} → {new_plan}")
            return {"success": True, "plan": new_plan, "limits": result["limits"]}
        except Exception as e:
            logger.error(f"upgrade_plan error: {e}")
            return {"success": False, "error": str(e)}

    async def cancel_subscription(self, tenant_id: str) -> bool:
        try:
            self.db.table("subscriptions").update({"status": "cancelled"}).eq("tenant_id", tenant_id).eq("status", "active").execute()
            self.db.table("tenants").update({"plan": "free", "status": "active"}).eq("id", tenant_id).execute()
            return True
        except Exception:
            return False

    # ── Stripe Checkout ──────────────────────────────────────

    async def create_checkout_session(self, tenant_id: str, plan: str,
                                       success_url: str, cancel_url: str) -> dict:
        if not self._stripe_ready:
            return {"error": "Stripe no configurado", "hint": "Agrega STRIPE_SECRET_KEY en .env"}

        plan_cfg  = PLANS.get(plan)
        price_id  = plan_cfg.get("stripe_price_id") or ""
        price_env = {
            "starter": getattr(settings, "STRIPE_PRICE_STARTER", ""),
            "pro":     getattr(settings, "STRIPE_PRICE_PRO", ""),
        }.get(plan, "")
        price_id  = price_id or price_env

        if not price_id:
            return {"error": f"STRIPE_PRICE_{plan.upper()} no configurado en .env"}

        try:
            session = stripe.checkout.Session.create(
                mode="subscription",
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                metadata={"tenant_id": tenant_id, "plan": plan},
                success_url=success_url,
                cancel_url=cancel_url,
            )
            return {"checkout_url": session.url, "session_id": session.id}
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            return {"error": str(e)}

    async def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Procesa webhooks de Stripe (payment_intent, subscription_updated, etc.)"""
        if not self._stripe_ready:
            return {"status": "stripe_not_configured"}
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return {"status": "invalid_payload"}
        except stripe.error.SignatureVerificationError:
            return {"status": "invalid_signature"}

        etype = event["type"]
        data  = event["data"]["object"]

        if etype == "checkout.session.completed":
            tenant_id = data["metadata"].get("tenant_id")
            plan      = data["metadata"].get("plan")
            if tenant_id and plan:
                await self.upgrade_plan(tenant_id, plan)
                logger.info(f"Stripe checkout complete: tenant={tenant_id} plan={plan}")

        elif etype in ("customer.subscription.deleted", "customer.subscription.paused"):
            # Downgrade a free si cancelan desde Stripe
            cid = data.get("customer")
            logger.warning(f"Stripe subscription {etype}: customer={cid}")

        return {"status": "processed", "type": etype}

    # ── Quota enforcement ────────────────────────────────────

    async def check_quota(self, tenant_id: str, resource: str) -> dict:
        """
        Verifica si un tenant puede consumir un recurso.
        resource: "tasks" | "executions" | "chat_messages" | "arbitrage_scans"
        """
        sub = await self.get_subscription(tenant_id)
        if not sub:
            # Sin subscripción: límite free
            sub = {"plan": "free", "limits": PLANS["free"]["limits"]}

        limit_key = f"{resource}_per_month"
        if resource == "chat_messages":
            limit_key = "chat_messages_per_day"

        limit = sub["limits"].get(limit_key, 0)
        if limit == -1:
            return {"allowed": True, "plan": sub["plan"], "limit": "unlimited"}

        # Contar uso actual
        used = await self._count_usage(tenant_id, resource)
        allowed = used < limit

        if not allowed:
            logger.warning(f"Quota exceeded: tenant={tenant_id} resource={resource} used={used} limit={limit}")

        return {
            "allowed":  allowed,
            "plan":     sub["plan"],
            "used":     used,
            "limit":    limit,
            "remaining": max(0, limit - used),
        }

    async def _count_usage(self, tenant_id: str, resource: str) -> int:
        """Cuenta el uso del mes/día actual para un tenant."""
        try:
            now   = datetime.utcnow()
            start = now.replace(day=1, hour=0, minute=0, second=0).isoformat()

            if resource in ("tasks", "executions"):
                table = resource if resource == "tasks" else "executions"
                r = (self.db.table(table).select("id", count="exact")
                     .eq("tenant_id", tenant_id)
                     .gte("created_at", start).execute())
                return r.count or 0

            if resource == "chat_messages":
                today = now.replace(hour=0, minute=0, second=0).isoformat()
                r = (self.db.table("chat_messages").select("id", count="exact")
                     .eq("tenant_id", tenant_id)
                     .gte("created_at", today).execute())
                return r.count or 0

            if resource == "arbitrage_scans":
                r = (self.db.table("arbitrage_opportunities").select("scan_id")
                     .eq("tenant_id", tenant_id)
                     .gte("created_at", start).execute())
                scan_ids = {row["scan_id"] for row in (r.data or [])}
                return len(scan_ids)

        except Exception as e:
            logger.error(f"_count_usage error: {e}")
        return 0

    async def get_usage_summary(self, tenant_id: str) -> dict:
        """Resumen de uso actual del tenant para el dashboard."""
        sub = await self.get_subscription(tenant_id) or {"plan": "free", "limits": PLANS["free"]["limits"]}
        resources = ["tasks", "executions", "chat_messages", "arbitrage_scans"]
        summary   = {}
        for r in resources:
            q = await self.check_quota(tenant_id, r)
            summary[r] = q
        return {"plan": sub["plan"], "resources": summary, "features": sub.get("features", [])}


billing_engine = BillingEngine()
