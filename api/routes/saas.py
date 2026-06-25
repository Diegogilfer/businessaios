# ============================================================
# BusinessAIOS - api/routes/saas.py
# FASE 11 — SaaS completo: tenants, keys, billing, Stripe, usage
# ============================================================

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from services.saas.tenant.tenant_manager import tenant_manager
from services.saas.api_keys.api_key_manager import api_key_manager
from services.saas.billing.billing_engine import billing_engine, PLANS
from core.logger import get_logger

router = APIRouter(prefix="/saas", tags=["SaaS — Fase 11"])
logger = get_logger("SaaSRouter")


# ── Schemas ───────────────────────────────────────────────────

class TenantCreate(BaseModel):
    name:  str
    email: str
    plan:  str = "free"

class UpgradeRequest(BaseModel):
    tenant_id: str
    new_plan:  str

class CheckoutRequest(BaseModel):
    tenant_id:   str
    plan:        str
    success_url: str = "http://localhost:3000/dashboard?upgraded=true"
    cancel_url:  str = "http://localhost:3000/dashboard?cancelled=true"

class KeyCreate(BaseModel):
    tenant_id: str
    name:      str = "default"

class KeyRevoke(BaseModel):
    key_id:    str
    tenant_id: str


# ── Tenants ───────────────────────────────────────────────────

@router.post("/tenants", summary="Registrar nuevo tenant")
async def create_tenant(data: TenantCreate):
    """
    Crea un nuevo tenant y su subscripción inicial.
    El tenant recibe una API key para autenticar sus requests.
    """
    if data.plan not in PLANS:
        raise HTTPException(400, f"Plan inválido. Opciones: {list(PLANS.keys())}")

    result = await tenant_manager.create_tenant(data.name, data.email, data.plan)
    if not result:
        raise HTTPException(500, "Error al crear el tenant")

    # Crear subscripción
    await billing_engine.create_subscription(result["tenant_id"], data.plan)

    # Auto-crear API key inicial
    key = await api_key_manager.create_key(result["tenant_id"], "default")

    return {
        **result,
        "api_key":    key.get("key"),
        "plan_limits": PLANS[data.plan]["limits"],
        "note":       "Guarda tu api_key — es la única vez que la verás completa",
    }


@router.get("/tenants/{tenant_id}", summary="Obtener datos del tenant")
async def get_tenant(tenant_id: str):
    tenant = await tenant_manager.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(404, "Tenant no encontrado")
    sub   = await billing_engine.get_subscription(tenant_id)
    stats = await tenant_manager.get_tenant_stats(tenant_id)
    return {**tenant, "subscription": sub, "stats": stats}


@router.get("/tenants", summary="Listar todos los tenants (admin)")
async def list_tenants(status: str = "active"):
    return await tenant_manager.list_tenants(status)


@router.delete("/tenants/{tenant_id}", summary="Eliminar tenant (GDPR)")
async def delete_tenant(tenant_id: str):
    ok = await tenant_manager.delete_tenant(tenant_id)
    return {"deleted": ok, "tenant_id": tenant_id}


@router.post("/tenants/{tenant_id}/suspend", summary="Suspender tenant")
async def suspend_tenant(tenant_id: str):
    ok = await tenant_manager.suspend_tenant(tenant_id)
    return {"suspended": ok}


# ── API Keys ──────────────────────────────────────────────────

@router.post("/api-keys", summary="Crear API key para tenant")
async def create_api_key(data: KeyCreate):
    return await api_key_manager.create_key(data.tenant_id, data.name)


@router.get("/api-keys/{tenant_id}", summary="Listar API keys del tenant")
async def list_api_keys(tenant_id: str):
    keys = await api_key_manager.list_keys(tenant_id)
    return {"keys": keys, "count": len(keys)}


@router.post("/api-keys/revoke", summary="Revocar API key")
async def revoke_key(data: KeyRevoke):
    ok = await api_key_manager.revoke_key(data.key_id, data.tenant_id)
    return {"revoked": ok}


@router.post("/api-keys/rotate", summary="Rotar API key (revoca + nueva)")
async def rotate_key(data: KeyRevoke):
    return await api_key_manager.rotate_key(data.key_id, data.tenant_id)


# ── Billing ───────────────────────────────────────────────────

@router.get("/billing/{tenant_id}", summary="Estado de subscripción")
async def get_billing(tenant_id: str):
    sub = await billing_engine.get_subscription(tenant_id)
    if not sub:
        return {"plan": "free", "status": "no_subscription",
                "limits": PLANS["free"]["limits"]}
    return sub


@router.post("/billing/upgrade", summary="Cambiar plan")
async def upgrade_plan(data: UpgradeRequest):
    result = await billing_engine.upgrade_plan(data.tenant_id, data.new_plan)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error al cambiar plan"))
    return result


@router.post("/billing/cancel/{tenant_id}", summary="Cancelar subscripción")
async def cancel_subscription(tenant_id: str):
    ok = await billing_engine.cancel_subscription(tenant_id)
    return {"cancelled": ok, "downgraded_to": "free"}


@router.post("/billing/checkout", summary="★ Crear sesión de pago Stripe")
async def create_checkout(data: CheckoutRequest):
    """
    Genera una URL de checkout de Stripe para upgrade de plan.
    Redirige al usuario a Stripe para pagar.
    Requiere STRIPE_SECRET_KEY y STRIPE_PRICE_{PLAN} en .env
    """
    return await billing_engine.create_checkout_session(
        data.tenant_id, data.plan, data.success_url, data.cancel_url
    )


@router.post("/billing/webhook", summary="Webhook de Stripe (no tocar)")
async def stripe_webhook(request: Request):
    """Recibe y procesa eventos de Stripe automáticamente."""
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    result     = await billing_engine.handle_webhook(payload, sig_header)
    if result.get("status") in ("invalid_payload", "invalid_signature"):
        raise HTTPException(400, result["status"])
    return result


# ── Usage / Quotas ────────────────────────────────────────────

@router.get("/usage/{tenant_id}", summary="★ Uso actual y quotas del tenant")
async def get_usage(tenant_id: str):
    """
    Muestra el consumo actual del tenant vs los límites de su plan.
    Ideal para mostrar en el dashboard del cliente.
    """
    return await billing_engine.get_usage_summary(tenant_id)


@router.get("/quota/{tenant_id}/{resource}", summary="Verificar quota de un recurso")
async def check_quota(tenant_id: str, resource: str):
    return await billing_engine.check_quota(tenant_id, resource)


# ── Planes ────────────────────────────────────────────────────

@router.get("/plans", summary="Listar planes disponibles")
async def list_plans():
    return {
        plan: {
            "price_monthly": cfg["price_monthly"],
            "limits":        cfg["limits"],
            "features":      cfg["features"],
        }
        for plan, cfg in PLANS.items()
    }


@router.get("/status", summary="Estado del sistema SaaS")
async def saas_status():
    return {
        "multi_tenant":      True,
        "billing_enabled":   True,
        "stripe_configured": bool(billing_engine._stripe_ready),
        "plans":             list(PLANS.keys()),
        "rls_enabled":       True,
        "api_key_auth":      True,
    }
