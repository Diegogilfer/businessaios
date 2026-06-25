# ============================================================
# BusinessAIOS - services/neuro_assist/neuro_assist.py
# Blueprint Fase 4 — NeuroAsistencia: proactividad + push
# El sistema habla PRIMERO antes de que el usuario pregunte
# ============================================================

import asyncio
from datetime import datetime, timedelta
from services.providers.llm_provider import get_llm_provider
from services.neuro.predictive_engine import predictive_engine
from services.copilot.executive_copilot import executive_copilot
from services.events.event_bus import event_bus
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("NeuroAssist")


class NeuroAssist:
    """
    NeuroAsistencia — el sistema proactivo del Blueprint Fase 4.

    A diferencia del ExecutiveCopilot (que responde preguntas),
    NeuroAssist actúa sin ser invocado:
    - Detecta patrones y notifica al usuario
    - Sugiere acciones antes de que las pida
    - Envía alertas por WebSocket en tiempo real
    - Genera recomendaciones contextuales post-ejecución
    """

    def __init__(self):
        self.llm = get_llm_provider()
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None
        self._active = False

    # ── Recomendación post-ejecución ─────────────────────────

    async def on_task_completed(self, task_id: str, agent_role: str,
                                 quality_score: float, result: str) -> dict:
        """
        Se llama automáticamente después de cada ejecución.
        Genera recomendación contextual basada en el resultado.
        """
        if quality_score < 0.65:
            suggestion_type = "retry_with_collaboration"
            message = f"La calidad fue {quality_score:.0%}. Te recomiendo ejecutar esta tarea con colaboración multi-agente para mejorar el resultado."
            action  = {"type": "retry", "use_collaboration": True, "task_id": task_id}
        elif quality_score >= 0.90:
            suggestion_type = "save_to_knowledge"
            message = f"Excelente resultado ({quality_score:.0%}). ¿Quieres guardar este análisis en la Knowledge Base para referencia futura?"
            action  = {"type": "save_knowledge", "task_id": task_id}
        else:
            # Siguiente paso lógico basado en categoría
            next_steps = await self._suggest_next_step(result, agent_role)
            suggestion_type = "next_step"
            message = next_steps
            action  = {"type": "suggestion"}

        notification = {
            "type":            "neuro_assist",
            "suggestion_type": suggestion_type,
            "message":         message,
            "action":          action,
            "quality_score":   quality_score,
            "task_id":         task_id,
            "timestamp":       datetime.utcnow().isoformat(),
        }

        # Publicar en EventBus → llega al WebSocket → Dashboard lo muestra
        event_bus.publish("neuro_assist.suggestion", notification)
        return notification

    async def _suggest_next_step(self, result: str, agent_role: str) -> str:
        """Sugiere el siguiente paso lógico basado en el resultado."""
        next_map = {
            "research":   "El Research Agent completó el análisis. ¿Quieres que el Commercial Agent diseñe una estrategia de go-to-market basada en estos datos?",
            "ceo":        "El CEO Agent generó la estrategia. ¿Quieres que el Finance Agent calcule las proyecciones financieras?",
            "commercial": "El Commercial Agent diseñó el funnel. ¿Quieres que el Content Agent cree los materiales de marketing para cada etapa?",
            "finance":    "El Finance Agent completó las proyecciones. ¿Quieres que el CEO Agent revise y genere el resumen ejecutivo?",
            "content":    "El Content Agent creó el contenido. ¿Quieres programar la distribución o crear variaciones A/B?",
            "operations": "El Operations Agent diseñó el proceso. ¿Quieres que el CEO Agent valide el plan y genere un roadmap de implementación?",
        }
        return next_map.get(agent_role, "Tarea completada. ¿Qué quieres hacer con este resultado?")

    # ── Análisis proactivo del contexto ─────────────────────

    async def analyze_chat_context(self, conversation_id: str,
                                    last_message: str, agent_role: str) -> dict | None:
        """
        Analiza el contexto de una conversación de chat y
        sugiere proactivamente información relevante o acciones.
        """
        # Detectar intenciones de alto valor
        keywords_finance  = ["inversión", "dinero", "costo", "precio", "revenue", "ganancia"]
        keywords_strategy = ["competencia", "mercado", "estrategia", "crecer", "expandir"]
        keywords_skill    = ["analizar", "proyectar", "diseñar", "crear plan"]

        msg_lower = last_message.lower()

        if any(k in msg_lower for k in keywords_finance):
            return {
                "type":    "skill_suggestion",
                "message": "Detecto que estás hablando de finanzas. ¿Quieres ejecutar el skill 'Financial Projection 12M' o 'Unit Economics Calculator' para obtener números concretos?",
                "skills":  ["financial_projection", "unit_economics"],
            }
        if any(k in msg_lower for k in keywords_strategy):
            return {
                "type":    "skill_suggestion",
                "message": "Para este análisis estratégico, el skill 'SWOT Analysis' o 'Porter Five Forces' pueden darte una estructura sólida.",
                "skills":  ["swot_analysis", "porter_five_forces"],
            }
        return None

    # ── Monitor de salud en tiempo real ─────────────────────

    async def health_monitor_tick(self) -> dict:
        """
        Se ejecuta periódicamente para monitorear el sistema.
        Publica alertas al EventBus si detecta problemas.
        """
        alerts = await executive_copilot.check_alerts()
        critical = [a for a in alerts if a["severity"] == "high"]

        if critical:
            for alert in critical:
                event_bus.publish("neuro_assist.alert", {
                    "severity": "high",
                    "message":  alert["message"],
                    "action":   alert["action"],
                    "timestamp": datetime.utcnow().isoformat(),
                })
            logger.warning(f"NeuroAssist: {len(critical)} critical alerts published")

        return {"alerts_published": len(critical), "total_alerts": len(alerts)}

    # ── Recomendación de skill contextual ───────────────────

    async def recommend_skill_for_task(self, task_description: str) -> dict:
        """
        Dado el título/descripción de una tarea, recomienda
        el skill más adecuado del marketplace.
        """
        from services.skills.skill_marketplace import skill_marketplace
        catalog = skill_marketplace.list_catalog()

        prompt = f"""
Tarea del usuario: "{task_description}"

Skills disponibles:
{chr(10).join(f'- {s["name"]}: {s["description"]}' for s in catalog[:10])}

¿Cuál skill se adapta mejor a esta tarea?
Responde SOLO con el nombre exacto del skill (ej: "swot_analysis").
Si ninguno aplica, responde "none".
"""
        try:
            rec = await self.llm.generate(prompt=prompt, system_context="Eres un asistente que recomienda herramientas. Responde con una sola palabra.")
            rec = rec.strip().strip('"').lower()
            skill = skill_marketplace.get_skill(rec)
            if skill:
                return {"recommended_skill": rec, "skill_details": skill, "confidence": 0.85}
        except Exception:
            pass
        return {"recommended_skill": None, "message": "No se encontró un skill específico — ejecuta la tarea directamente"}


neuro_assist = NeuroAssist()
