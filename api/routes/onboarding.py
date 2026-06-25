# ============================================================
# BusinessAIOS - api/routes/onboarding.py
# Registro self-service + onboarding automático
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.onboarding.onboarding_service import onboarding_service
from services.saas.billing.billing_engine import PLANS

router = APIRouter(prefix="/onboarding", tags=["Onboarding — Deploy"])


class RegisterRequest(BaseModel):
    name:    str
    email:   str
    plan:    str  = "free"
    company: str  = ""


@router.post("/register", summary="★ Registro self-service completo")
async def register(data: RegisterRequest):
    """
    Registro de nuevo cliente con onboarding automático.

    En un solo request:
    - Crea el tenant
    - Genera la API key
    - Activa la subscripción
    - Envía email de bienvenida con instrucciones

    Devuelve todo lo necesario para empezar a usar la API en < 2 minutos.
    """
    if data.plan not in PLANS:
        raise HTTPException(400, f"Plan inválido. Opciones: {list(PLANS.keys())}")
    if not data.email or "@" not in data.email:
        raise HTTPException(400, "Email inválido")
    if not data.name.strip():
        raise HTTPException(400, "Nombre requerido")

    result = await onboarding_service.register_and_onboard(
        name=data.name, email=data.email,
        plan=data.plan, company=data.company,
    )
    if not result.get("success"):
        raise HTTPException(500, result.get("error", "Error en el registro"))
    return result


@router.get("/plans", summary="Planes disponibles para registro")
async def get_plans():
    """Lista los planes disponibles con precios y límites."""
    return [
        {
            "id":            plan,
            "name":          plan.capitalize(),
            "price_monthly": cfg["price_monthly"],
            "limits":        cfg["limits"],
            "features":      cfg["features"],
            "recommended":   plan == "starter",
        }
        for plan, cfg in PLANS.items()
    ]


@router.get("/health", summary="Health check público (sin auth)")
async def health():
    """Endpoint de health check para monitoring externo."""
    return {
        "status":  "healthy",
        "service": "BusinessAIOS",
        "version": "1.3.0",
    }
