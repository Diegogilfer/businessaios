# ============================================================
# BusinessAIOS - services/copilot/executive_copilot.py
# FASE 12 — Executive Copilot: asistente proactivo del CEO
# Genera recomendaciones, alertas y análisis automáticos
# ============================================================

from datetime import datetime, timedelta
from services.providers.llm_provider import get_llm_provider
from services.neuro.predictive_engine import predictive_engine
from services.growth.growth_engine import growth_engine
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("ExecutiveCopilot")


class ExecutiveCopilot:
    """
    Executive Copilot — el asistente proactivo del sistema.

    No espera preguntas: analiza el estado del sistema
    y genera recomendaciones, alertas tempranas y
    oportunidades de acción para el CEO/operador.

    Diferencia con el CEO Agent:
    - CEO Agent responde preguntas del usuario
    - Executive Copilot monitorea y alerta proactivamente
    """

    def __init__(self):
        self.llm = get_llm_provider()
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None

    # ── Briefing diario ─────────────────────────────────────

    async def generate_daily_briefing(self) -> dict:
        """
        Genera el briefing ejecutivo diario.
        Resumen de lo ocurrido + prioridades del día.
        """
        state     = await self._collect_system_state()
        trends    = await predictive_engine.get_usage_trends(7)
        segments  = await predictive_engine.get_behavior_segments()
        growth    = growth_engine.get_growth_report()

        prompt = f"""
Eres el Executive Copilot de BusinessAIOS. Genera un briefing ejecutivo conciso en español.

ESTADO DEL SISTEMA HOY:
- Tareas completadas (7 días): {state['completed_7d']}
- Tareas fallidas (7 días): {state['failed_7d']}
- Quality score promedio: {state['avg_quality']}
- Conversaciones activas: {state['conversations']}
- Oportunidades de arbitraje viables: {state['viable_opps']}
- Tendencia de uso: {trends.get('trend', 'estable')} ({trends.get('growth_rate', 0)}%)
- Grade del sistema: {growth.get('health_grade', 'N/A')}

SEGMENTOS DE MEJOR RENDIMIENTO:
{', '.join(s['category'] for s in segments.get('segments', [])[:3] if s.get('performance') == 'strong') or 'Sin datos'}

RECOMENDACIONES DEL GROWTH ENGINE:
{chr(10).join(f"- [{r['priority'].upper()}] {r['action']}" for r in growth.get('recommendations', [])[:3])}

Genera un briefing ejecutivo con:
1. Resumen en 2 oraciones de cómo está el sistema
2. 3 prioridades de acción para hoy (específicas y accionables)
3. Una alerta si detectas algo urgente (o "Sin alertas críticas")

Formato: directo, orientado a decisiones, máximo 200 palabras.
"""

        try:
            response = await self.llm.generate(
                prompt=prompt,
                system_context="Eres un asistente ejecutivo de IA. Eres directo, conciso y orientado a resultados. Siempre en español.",
            )
        except Exception as e:
            response = f"Error generando briefing: {e}"

        return {
            "type":        "daily_briefing",
            "generated_at": datetime.utcnow().isoformat(),
            "briefing":    response,
            "metrics": {
                "completed_7d":  state["completed_7d"],
                "failed_7d":     state["failed_7d"],
                "avg_quality":   state["avg_quality"],
                "viable_opps":   state["viable_opps"],
                "growth_grade":  growth.get("health_grade", "N/A"),
                "usage_trend":   trends.get("trend", "stable"),
            },
        }

    # ── Alertas proactivas ──────────────────────────────────

    async def check_alerts(self) -> list[dict]:
        """
        Verifica el sistema en busca de situaciones que
        requieren atención inmediata. Sin preguntas — actúa.
        """
        alerts = []
        state  = await self._collect_system_state()

        # Alerta: tasa de fallos alta
        total  = max(state["completed_7d"] + state["failed_7d"], 1)
        fail_r = state["failed_7d"] / total
        if fail_r > 0.20:
            alerts.append({
                "severity": "high",
                "type":     "high_failure_rate",
                "message":  f"Tasa de fallos del {fail_r*100:.0f}% en los últimos 7 días",
                "action":   "Revisa logs: python main.py y verifica DEEPSEEK_API_KEY en .env",
                "detected_at": datetime.utcnow().isoformat(),
            })

        # Alerta: quality drift
        for role in ["ceo", "research", "commercial", "finance"]:
            pred = await predictive_engine.predict_quality(role)
            if pred["trend"] == "declining" and pred["predicted_quality"] < 0.65:
                alerts.append({
                    "severity":   "medium",
                    "type":       "quality_drift",
                    "message":    f"{role} Agent: calidad bajando ({pred['predicted_quality']:.0%})",
                    "action":     f"Revisa el system_prompt del {role} agent en agent_definitions.py",
                    "agent_role": role,
                    "detected_at": datetime.utcnow().isoformat(),
                })

        # Alerta: sin actividad reciente
        if state["completed_7d"] == 0:
            alerts.append({
                "severity": "low",
                "type":     "no_activity",
                "message":  "Sin ejecuciones en los últimos 7 días",
                "action":   "El sistema está inactivo. Ejecuta una tarea de prueba desde el dashboard.",
                "detected_at": datetime.utcnow().isoformat(),
            })

        # Alerta: oportunidades de arbitraje sin revisar
        if state["viable_opps"] > 10:
            alerts.append({
                "severity": "info",
                "type":     "arbitrage_opportunity",
                "message":  f"{state['viable_opps']} oportunidades viables sin revisar",
                "action":   "Revisa el tab Arbitrage en el dashboard para actuar sobre ellas",
                "detected_at": datetime.utcnow().isoformat(),
            })

        return sorted(alerts, key=lambda a: {"high": 0, "medium": 1, "low": 2, "info": 3}[a["severity"]])

    # ── Auto-análisis del negocio ────────────────────────────

    async def analyze_business(self, focus_area: str = "general") -> dict:
        """
        Análisis profundo del negocio con IA.
        Combina datos reales del sistema con inteligencia del LLM.
        """
        state    = await self._collect_system_state()
        segments = await predictive_engine.get_behavior_segments()
        trends   = await predictive_engine.get_usage_trends(30)

        focus_prompts = {
            "growth":      "Enfócate en oportunidades de crecimiento y expansión",
            "cost":        "Enfócate en reducción de costos operativos",
            "quality":     "Enfócate en mejorar la calidad de los agentes",
            "arbitrage":   "Enfócate en maximizar el retorno del Arbitrage Engine",
            "general":     "Análisis estratégico completo del negocio",
        }

        prompt = f"""
Analiza el siguiente estado de BusinessAIOS y genera un análisis estratégico.

MÉTRICAS CLAVE:
- Total ejecuciones: {state['total_executions']}
- Tasa de éxito: {state['success_rate']}%
- Oportunidades arbitraje viables: {state['viable_opps']}
- Entradas de conocimiento: {state['knowledge_entries']}
- Tendencia de crecimiento: {trends.get('growth_rate', 0)}% ({trends.get('trend', 'estable')})
- Conversaciones de chat: {state['conversations']}

CATEGORÍAS MÁS ACTIVAS:
{chr(10).join(f"- {s['category']}: {s['total_tasks']} tareas, {s['completion_rate']}% éxito" for s in segments.get('segments', [])[:4])}

FOCO DEL ANÁLISIS: {focus_prompts.get(focus_area, focus_prompts['general'])}

Genera un análisis ejecutivo que incluya:
1. Diagnóstico del estado actual (2-3 oraciones)
2. 3 oportunidades concretas identificadas en los datos
3. 3 riesgos o cuellos de botella detectados
4. Plan de acción de 30 días con métricas de éxito

Sé específico con los números. Máximo 350 palabras.
"""
        try:
            analysis = await self.llm.generate(
                prompt=prompt,
                system_context="Eres un analista de negocios senior especializado en plataformas SaaS de IA. Siempre en español. Orientado a datos y decisiones.",
            )
        except Exception as e:
            analysis = f"Error generando análisis: {e}"

        return {
            "type":         "business_analysis",
            "focus_area":   focus_area,
            "generated_at": datetime.utcnow().isoformat(),
            "analysis":     analysis,
            "data_snapshot": {
                "success_rate":   state["success_rate"],
                "viable_opps":    state["viable_opps"],
                "growth_rate":    trends.get("growth_rate", 0),
                "top_category":   segments["segments"][0]["category"] if segments.get("segments") else "N/A",
            },
        }

    # ── Utilidades internas ──────────────────────────────────

    async def _collect_system_state(self) -> dict:
        state: dict = {
            "completed_7d": 0, "failed_7d": 0, "avg_quality": 0,
            "total_executions": 0, "success_rate": 0,
            "conversations": 0, "viable_opps": 0, "knowledge_entries": 0,
        }
        if not self.db:
            return state
        try:
            since = (datetime.utcnow() - timedelta(days=7)).isoformat()

            r = self.db.table("executions").select("status,quality_score").gte("created_at", since).execute()
            execs = r.data or []
            state["total_executions"] = len(execs)
            state["completed_7d"]     = sum(1 for e in execs if e["status"] == "completed")
            state["failed_7d"]        = sum(1 for e in execs if e["status"] == "failed")
            qs = [float(e.get("quality_score") or 0) for e in execs if e.get("quality_score")]
            state["avg_quality"]      = round(sum(qs) / len(qs), 2) if qs else 0
            state["success_rate"]     = round(state["completed_7d"] / max(state["total_executions"], 1) * 100, 1)

            r2 = self.db.table("conversations").select("id", count="exact").execute()
            state["conversations"]    = r2.count or 0

            r3 = self.db.table("arbitrage_opportunities").select("id", count="exact").eq("viable", True).execute()
            state["viable_opps"]      = r3.count or 0

            r4 = self.db.table("global_knowledge").select("id", count="exact").execute()
            state["knowledge_entries"] = r4.count or 0

        except Exception as e:
            logger.error(f"_collect_system_state error: {e}")
        return state


executive_copilot = ExecutiveCopilot()
