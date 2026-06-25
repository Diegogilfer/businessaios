from fastapi import APIRouter
from services.growth.growth_engine import growth_engine
from services.audit.audit_service import audit_service
from services.personality.personality_engine import personality_engine, DEFAULT_PERSONALITIES
from pydantic import BaseModel

router = APIRouter(prefix="/growth", tags=["Growth & Audit (Blueprint 2026)"])

@router.get("/report", summary="★ Reporte GEO completo con recomendaciones")
async def growth_report():
    return growth_engine.get_growth_report()

@router.get("/audit/{agent_role}", summary="Reporte de auditoría por agente")
async def agent_audit(agent_role: str, days: int = 7):
    return audit_service.get_agent_report(agent_role, days)

@router.get("/personalities", summary="Perfiles de personalidad de los agentes")
async def list_personalities():
    return {
        role: {
            "mode": p.mode, "tone": p.tone,
            "verbosity": p.verbosity, "expertise": p.expertise,
            "ab_variant": p.ab_variant,
        }
        for role, p in DEFAULT_PERSONALITIES.items()
    }

class PersonalityUpdate(BaseModel):
    role: str
    tone: str | None = None
    verbosity: str | None = None
    custom_instructions: str | None = None
    tenant_id: str = "default"

@router.patch("/personalities", summary="Actualizar personalidad de un agente")
async def update_personality(data: PersonalityUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None and k not in ("role","tenant_id")}
    p = personality_engine.update_personality(data.role, updates, data.tenant_id)
    return {"updated": True, "role": p.role, "tone": p.tone, "verbosity": p.verbosity}
