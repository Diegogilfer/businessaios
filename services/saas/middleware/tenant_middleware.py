from fastapi import HTTPException
from fastapi import Request
from services.saas.api_keys.api_key_manager import api_key_manager
from services.saas.billing.billing_engine import billing_engine
from core.logger import get_logger

logger = get_logger("TenantMiddleware")

async def resolve_tenant(request: Request) -> dict | None:
    api_key = (request.headers.get("X-API-Key") or
               request.headers.get("X-Tenant-Key") or
               request.query_params.get("api_key"))
    if not api_key or not api_key.startswith("bios_"):
        return None
    tenant_data = await api_key_manager.validate_key(api_key)
    if not tenant_data:
        raise HTTPException(401, {
            "error": "API key inválida",
            "action": "Crea una nueva clave en POST /saas/api-keys",
        })
    return tenant_data

async def enforce_quota(tenant_id: str, resource: str):
    result = await billing_engine.check_quota(tenant_id, resource)
    if not result["allowed"]:
        raise HTTPException(429, {
            "error":    "Quota excedida",
            "resource": resource,
            "plan":     result["plan"],
            "used":     result["used"],
            "limit":    result["limit"],
            "action":   "Actualiza tu plan en POST /saas/billing/upgrade",
        })
    return result
