# ============================================================
# BusinessAIOS - api/routes/neuro.py
# FASE 12 — NeuroIA endpoints: predicción + copilot + analytics
# ============================================================

from fastapi import APIRouter, Query
from services.neuro.predictive_engine import predictive_engine
from services.copilot.executive_copilot import executive_copilot
from services.growth.growth_engine import growth_engine

router = APIRouter(prefix="/neuro", tags=["NeuroIA — Fase 12"])


# ── Copilot ──────────────────────────────────────────────────

@router.get("/briefing", summary="★ Briefing ejecutivo diario (IA)")
async def daily_briefing():
    """
    Genera el briefing ejecutivo del día.
    Analiza el estado real del sistema y produce recomendaciones accionables.
    Llama al LLM para síntesis inteligente.
    """
    return await executive_copilot.generate_daily_briefing()


@router.get("/alerts", summary="★ Alertas proactivas del sistema")
async def system_alerts():
    """
    Escanea el sistema en busca de situaciones que requieren atención.
    No espera preguntas — detecta y alerta automáticamente.
    """
    return await executive_copilot.check_alerts()


@router.get("/analyze", summary="Análisis profundo del negocio")
async def analyze_business(focus: str = Query("general", description="general | growth | cost | quality | arbitrage")):
    """
    Análisis estratégico generado por IA con datos reales.
    Identifica oportunidades, riesgos y plan de acción de 30 días.
    """
    return await executive_copilot.analyze_business(focus)


# ── Predicción ───────────────────────────────────────────────

@router.get("/predict/{agent_role}", summary="Predecir calidad del agente")
async def predict_quality(agent_role: str, category: str = "general"):
    """
    Predice la calidad esperada de la próxima ejecución.
    Basado en media móvil ponderada del historial real.
    """
    return await predictive_engine.predict_quality(agent_role, category)


@router.get("/predict/all", summary="Predicción de todos los agentes")
async def predict_all():
    """Predicción simultánea de los 6 agentes."""
    roles = ["ceo", "research", "commercial", "content", "finance", "operations"]
    results = {}
    for role in roles:
        results[role] = await predictive_engine.predict_quality(role)
    return {"predictions": results, "generated_at": __import__("datetime").datetime.utcnow().isoformat()}


@router.get("/recommend", summary="Recomendar agente para una tarea")
async def recommend_agent(category: str = "general", description: str = ""):
    """
    Recomienda el agente más adecuado para una tarea
    basándose en performance histórico real.
    """
    return await predictive_engine.recommend_agent(category, description)


# ── Analytics avanzados ──────────────────────────────────────

@router.get("/segments", summary="Segmentación de comportamiento")
async def behavior_segments():
    """
    Analiza qué categorías de tareas funcionan mejor/peor.
    Ideal para optimizar el uso de los agentes.
    """
    return await predictive_engine.get_behavior_segments()


@router.get("/trends", summary="Tendencias de uso (N días)")
async def usage_trends(days: int = 30):
    """
    Tendencias históricas de uso: ejecuciones, calidad, crecimiento.
    """
    return await predictive_engine.get_usage_trends(days)


@router.get("/growth", summary="Reporte GEO completo")
async def growth_report():
    """Reporte del Growth Engine con métricas y recomendaciones."""
    return growth_engine.get_growth_report()


# ── Auto-Learning ─────────────────────────────────────────────
from services.neuro.auto_learning import auto_learning
from pydantic import BaseModel

class LearningCycleRequest(BaseModel):
    auto_apply: bool = False   # True = aplica mejoras automáticamente si confianza > 0.85

@router.post("/learning/run", summary="★ Ejecutar ciclo de auto-aprendizaje")
async def run_learning_cycle(data: LearningCycleRequest):
    """
    Analiza ejecuciones recientes de baja calidad y propone
    mejoras de prompts para cada agente.

    Con auto_apply=true aplica las mejoras automáticamente
    cuando la confianza supera el 85%.
    """
    return await auto_learning.run_cycle(auto_apply=data.auto_apply)

@router.get("/learning/history", summary="Historial de ciclos de aprendizaje")
async def learning_history(limit: int = 10):
    return await auto_learning.get_learning_history(limit)


# ── NeuroAsistencia (Blueprint Fase 4) ───────────────────────
from services.neuro_assist.neuro_assist import neuro_assist

class SkillRecommendRequest(BaseModel):
    task_description: str

@router.post("/assist/recommend-skill", summary="★ Recomendar skill para una tarea")
async def recommend_skill(data: SkillRecommendRequest):
    """
    Analiza la descripción de una tarea y recomienda
    el skill del marketplace más adecuado.
    """
    return await neuro_assist.recommend_skill_for_task(data.task_description)

@router.get("/assist/health-check", summary="Monitor proactivo de salud")
async def health_check_tick():
    """Ejecuta un tick del monitor de salud y publica alertas al WebSocket."""
    return await neuro_assist.health_monitor_tick()


# ── Auto-Optimization Engine (Blueprint Fase 5) ──────────────
from services.neuro.auto_optimizer import auto_optimizer

class OptimizationRequest(BaseModel):
    dry_run: bool = True

@router.get("/optimizer/status", summary="Estado del Auto-Optimization Engine")
async def optimizer_status():
    """Estado actual del motor, thresholds y ciclos recientes."""
    return await auto_optimizer.get_status()

@router.post("/optimizer/self-heal", summary="★ Ejecutar auto-reparación del sistema")
async def run_self_heal():
    """
    Diagnostica el sistema y ejecuta acciones de recuperación automáticas.
    Detecta: agentes degradados, fallos acumulados, knowledge estancado.
    """
    return await auto_optimizer.self_heal()

@router.post("/optimizer/optimize-prompts", summary="Optimizar prompts de todos los agentes")
async def optimize_prompts(data: OptimizationRequest):
    """
    Analiza rendimiento y reescribe prompts de bajo rendimiento.
    dry_run=true → solo propone. dry_run=false → aplica automáticamente.
    """
    return await auto_optimizer.optimize_all_prompts(dry_run=data.dry_run)

@router.post("/optimizer/tune-thresholds", summary="Ajustar umbrales con datos reales")
async def tune_thresholds():
    """
    Recalibra los umbrales del sistema basándose en los
    percentiles reales de los últimos 200 registros.
    """
    return await auto_optimizer.tune_thresholds()

@router.post("/optimizer/full-cycle", summary="★★ Ciclo completo de optimización")
async def full_optimization_cycle():
    """
    El ciclo más poderoso: tune → self-heal → optimize → report.
    Ejecuta secuencialmente todos los pasos de optimización.
    Diseñado para correr semanalmente (APScheduler lo programa).
    """
    return await auto_optimizer.run_full_optimization_cycle()

@router.get("/optimizer/history", summary="Historial de ciclos de optimización")
async def optimizer_history(limit: int = 10):
    return await auto_optimizer.get_history(limit)
