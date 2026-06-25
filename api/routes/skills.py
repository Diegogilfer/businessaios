# ============================================================
# BusinessAIOS - api/routes/skills.py
# Blueprint Fase 3 — Skills Marketplace endpoints
# ============================================================

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from services.skills.skill_marketplace import skill_marketplace

router = APIRouter(prefix="/skills", tags=["Skills Marketplace — Blueprint F3"])


class InstallRequest(BaseModel):
    skill_name: str
    tenant_id:  str = "default"

class ExecuteRequest(BaseModel):
    skill_name: str
    params:     dict
    tenant_id:  str = "default"


@router.get("/catalog", summary="★ Catálogo completo de skills")
async def list_catalog(
    category:   Optional[str] = Query(None, description="analysis | content | finance | sales | operations"),
    agent_role: Optional[str] = Query(None, description="ceo | research | commercial | content | finance | operations"),
):
    return {
        "skills": skill_marketplace.list_catalog(category, agent_role),
        "stats":  skill_marketplace.get_stats(),
    }

@router.get("/catalog/{skill_name}", summary="Detalle de un skill")
async def get_skill(skill_name: str):
    skill = skill_marketplace.get_skill(skill_name)
    if not skill:
        from fastapi import HTTPException
        raise HTTPException(404, f"Skill '{skill_name}' no encontrado")
    return skill

@router.post("/install", summary="Instalar un skill")
async def install_skill(data: InstallRequest):
    return await skill_marketplace.install(data.skill_name, data.tenant_id)

@router.delete("/install/{skill_name}", summary="Desinstalar un skill")
async def uninstall_skill(skill_name: str, tenant_id: str = "default"):
    ok = await skill_marketplace.uninstall(skill_name, tenant_id)
    return {"uninstalled": ok, "skill": skill_name}

@router.get("/installed", summary="Skills instalados para un tenant")
async def get_installed(tenant_id: str = "default"):
    skills = await skill_marketplace.get_installed(tenant_id)
    return {"installed": skills, "count": len(skills)}

@router.post("/execute", summary="★ Ejecutar un skill directamente")
async def execute_skill(data: ExecuteRequest):
    """
    Ejecuta un skill con parámetros y retorna el resultado del agente.

    Ejemplo para SWOT Analysis:
    ```json
    {
      "skill_name": "swot_analysis",
      "params": {
        "subject": "Mi startup de delivery de comida saludable",
        "context": "Mercado colombiano, Cali, presupuesto $50k USD"
      }
    }
    ```
    """
    return await skill_marketplace.execute_skill(data.skill_name, data.params, data.tenant_id)

@router.get("/stats", summary="Estadísticas del marketplace")
async def marketplace_stats():
    return skill_marketplace.get_stats()
