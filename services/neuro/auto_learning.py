# ============================================================
# BusinessAIOS - services/neuro/auto_learning.py
# FASE 12 — Auto-learning loop: el sistema mejora solo
# Analiza ejecuciones de baja calidad y propone mejoras de prompts
# ============================================================

from datetime import datetime, timedelta
from services.agents.agent_definitions import AGENT_DEFINITIONS
from services.personality.personality_engine import personality_engine
from core.logger import get_logger

logger = get_logger("AutoLearning")


class AutoLearningLoop:
    """
    Loop de auto-mejora del sistema.

    Cada ciclo:
    1. Detecta tareas con quality_score bajo
    2. Analiza patrones de fallo con el LLM
    3. Propone mejoras de system_prompt para el agente
    4. Registra la mejora para revisión del operador
    5. (Opcional) aplica la mejora automáticamente si confianza > 0.85

    Esto implementa el "Auto-Optimization Engine" del Blueprint Fase 5.
    """

    def __init__(self):
        self._llm = None
        self._db  = None

    @property
    def llm(self):
        if self._llm is None:
            from services.providers.llm_provider import get_llm_provider
            self._llm = get_llm_provider()
        return self._llm

    @property
    def db(self):
        if self._db is None:
            try:
                from core.database import get_supabase
                self._db = get_supabase()
            except Exception:
                pass
        return self._db
        self.MIN_QUALITY   = 0.60   # Por debajo de esto → analizar
        self.MIN_SAMPLES   = 3      # Mínimo de muestras para aprender
        self.AUTO_APPLY_TH = 0.85   # Confianza mínima para aplicar auto

    async def run_cycle(self, auto_apply: bool = False) -> dict:
        """
        Ejecuta un ciclo completo de auto-aprendizaje.
        Retorna un reporte de mejoras propuestas.
        """
        logger.info("Auto-learning cycle started")
        improvements = []
        agents_analyzed = []

        for role in AGENT_DEFINITIONS:
            result = await self._analyze_agent(role, auto_apply)
            if result:
                improvements.append(result)
                agents_analyzed.append(role)

        # Persistir reporte
        report = {
            "cycle_at":        datetime.utcnow().isoformat(),
            "agents_analyzed": agents_analyzed,
            "improvements":    improvements,
            "auto_applied":    auto_apply,
            "total_proposals": len(improvements),
        }

        if self.db:
            try:
                self.db.table("learning_reports").insert({
                    "report":     report,
                    "created_at": datetime.utcnow().isoformat(),
                }).execute()
            except Exception:
                pass

        logger.info(f"Auto-learning cycle complete: {len(improvements)} improvements proposed")
        return report

    async def _analyze_agent(self, role: str, auto_apply: bool) -> dict | None:
        """Analiza un agente y propone mejora si es necesario."""
        if not self.db:
            return None

        try:
            since = (datetime.utcnow() - timedelta(days=14)).isoformat()
            r = (self.db.table("executions")
                 .select("quality_score,execution_time_seconds,status,task_id")
                 .eq("agent_used", role)
                 .gte("created_at", since)
                 .order("created_at", desc=True)
                 .limit(30).execute())
            execs = r.data or []
        except Exception:
            return None

        if len(execs) < self.MIN_SAMPLES:
            return None

        low_quality = [e for e in execs if (e.get("quality_score") or 0) < self.MIN_QUALITY]
        if len(low_quality) < self.MIN_SAMPLES:
            return None  # No hay suficientes fallos para aprender

        avg_q  = sum(e.get("quality_score") or 0 for e in execs) / len(execs)
        fail_r = len(low_quality) / len(execs)

        # Obtener samples de las tareas fallidas
        failed_samples = []
        for exec_rec in low_quality[:5]:
            if not exec_rec.get("task_id"):
                continue
            try:
                t = self.db.table("tasks").select("title,description,category").eq("id", exec_rec["task_id"]).execute()
                if t.data:
                    failed_samples.append(t.data[0].get("title", ""))
            except Exception:
                pass

        agent_def = AGENT_DEFINITIONS.get(role)
        current_prompt = getattr(agent_def, "system_prompt", "") if agent_def else ""

        prompt = f"""
Analiza el rendimiento del {role} agent de BusinessAIOS.

MÉTRICAS:
- Quality score promedio: {avg_q:.2f}/1.0
- Tasa de fallos: {fail_r*100:.0f}%
- Ejecuciones analizadas: {len(execs)}
- Muestras de baja calidad: {len(low_quality)}

TAREAS QUE FALLARON:
{chr(10).join(f'- {s}' for s in failed_samples[:5]) or '(sin descripción disponible)'}

SYSTEM PROMPT ACTUAL:
{current_prompt[:400] if current_prompt else '(no configurado)'}

Propón UNA mejora específica al system_prompt que podría mejorar la calidad.
La mejora debe ser concisa (máximo 2 oraciones).
Responde SOLO con la mejora propuesta, sin explicaciones adicionales.
"""

        try:
            improvement = await self.llm.generate(
                prompt=prompt,
                system_context="Eres un experto en optimización de prompts para agentes de IA. Propón mejoras concretas y medibles.",
            )
            improvement = improvement.strip()
        except Exception as e:
            logger.error(f"LLM error in auto_learning for {role}: {e}")
            return None

        confidence = min(0.95, fail_r * 1.5)  # más fallos → más confianza en que hay problema

        result = {
            "agent_role":       role,
            "avg_quality":      round(avg_q, 3),
            "failure_rate":     round(fail_r, 2),
            "proposed_improvement": improvement,
            "confidence":       round(confidence, 2),
            "applied":          False,
            "analyzed_at":      datetime.utcnow().isoformat(),
        }

        # Auto-aplicar si confianza alta y operador lo autorizó
        if auto_apply and confidence >= self.AUTO_APPLY_TH:
            personality_engine.update_personality(role, {
                "custom_instructions": improvement
            })
            result["applied"] = True
            logger.info(f"Auto-applied improvement to {role} (confidence={confidence:.2f})")

        return result

    async def get_learning_history(self, limit: int = 10) -> list:
        """Historial de ciclos de aprendizaje."""
        if not self.db:
            return []
        try:
            r = (self.db.table("learning_reports")
                 .select("*").order("created_at", desc=True).limit(limit).execute())
            return r.data or []
        except Exception:
            return []


auto_learning = AutoLearningLoop()
