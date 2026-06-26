# ============================================================
# BusinessAIOS - services/neuro/auto_optimizer.py
# Blueprint Fase 5 — Auto-Optimization Engine completo
# Self-healing + auto-scaling + prompt optimization + health recovery
# ============================================================

import asyncio
import time
from datetime import datetime, timedelta
from services.neuro.auto_learning import auto_learning
from services.neuro.predictive_engine import predictive_engine
from services.personality.personality_engine import personality_engine
from services.audit.audit_service import audit_service
from services.events.event_bus import event_bus
from core.config import settings
from core.logger import get_logger

logger = get_logger("AutoOptimizer")


class AutoOptimizationEngine:
    """
    Blueprint Fase 5 — Motor de auto-optimización completo.

    El sistema se diagnostica, repara y mejora solo, sin intervención humana.

    Capacidades:
    ─────────────────────────────────────────────────────────
    1. SELF-HEALING:    Detecta degradación y se auto-repara
    2. PROMPT OPTIMIZER: Reescribe prompts de bajo rendimiento
    3. THRESHOLD TUNER:  Ajusta umbrales según patrones reales
    4. HEALTH RECOVERY:  Recupera el sistema tras fallos
    5. PERFORMANCE LOOP: Ciclo continuo de mejora medible
    ─────────────────────────────────────────────────────────
    """

    def __init__(self):
        self._llm = None
        self._db  = None

        # Umbrales adaptativos (se ajustan solos con el tiempo)
        self.thresholds = {
            "min_quality":         0.65,   # quality mínima aceptable
            "degradation_window":  7,      # días para detectar degradación
            "recovery_threshold":  0.75,   # calidad objetivo post-recovery
            "auto_apply_confidence": 0.82, # confianza mínima para auto-aplicar
            "max_retry_tasks":     3,      # retries máximos por tarea fallida
        }

        self._optimization_history: list[dict] = []
        logger.info("AutoOptimizationEngine initialized")

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

    # ── 1. SELF-HEALING ─────────────────────────────────────

    async def self_heal(self) -> dict:
        """
        Diagnóstica el sistema y ejecuta acciones de recuperación.
        Se llama automáticamente cuando se detectan anomalías.
        """
        logger.info("Self-healing cycle started")
        actions_taken = []
        issues_found  = []

        # --- Diagnóstico 1: Agentes con calidad degradada
        for role in ["ceo", "research", "commercial", "content", "finance", "operations"]:
            pred = await predictive_engine.predict_quality(role)
            if pred["trend"] == "declining" and pred["predicted_quality"] < self.thresholds["min_quality"]:
                issues_found.append(f"{role}: quality={pred['predicted_quality']:.0%} trend=declining")
                result = await self._heal_agent(role, pred)
                actions_taken.append(result)

        # --- Diagnóstico 2: Tareas fallidas acumuladas
        failed = await self._count_recent_failures()
        if failed > 10:
            issues_found.append(f"Alto número de fallos recientes: {failed}")
            action = await self._analyze_failure_patterns()
            actions_taken.append(action)

        # --- Diagnóstico 3: Knowledge base estancada
        kb_stale = await self._check_knowledge_stagnation()
        if kb_stale:
            issues_found.append("Knowledge base sin actualizaciones en 7+ días")
            actions_taken.append({
                "action": "knowledge_alert",
                "message": "Ejecuta tareas con save_to_knowledge=true para alimentar el RAG",
            })

        # --- Diagnóstico 4: Scheduler sin ejecutar
        sched_ok = await self._check_scheduler_health()
        if not sched_ok:
            issues_found.append("Jobs programados sin ejecutarse")
            actions_taken.append({"action": "scheduler_alert", "message": "Verifica que APScheduler esté corriendo"})

        report = {
            "type":          "self_healing",
            "executed_at":   datetime.utcnow().isoformat(),
            "issues_found":  issues_found,
            "actions_taken": actions_taken,
            "system_grade":  "recovering" if issues_found else "healthy",
        }

        # Publicar al live feed
        event_bus.publish("auto_optimizer.self_heal", {
            "issues": len(issues_found),
            "actions": len(actions_taken),
            "grade": report["system_grade"],
        })

        # Persistir reporte
        if self.db:
            try:
                self.db.table("optimization_reports").insert({
                    "report":     report,
                    "created_at": datetime.utcnow().isoformat(),
                }).execute()
            except Exception:
                pass

        audit_service.log("self_healing", "auto_optimizer", f"Healed {len(actions_taken)} issues", {
            "issues": issues_found, "actions": len(actions_taken),
        })

        logger.info(f"Self-healing complete: {len(issues_found)} issues, {len(actions_taken)} actions")
        return report

    async def _heal_agent(self, role: str, pred: dict) -> dict:
        """Genera y aplica un prompt mejorado para un agente degradado."""
        from services.agents.agent_definitions import AGENT_DEFINITIONS
        agent_def    = AGENT_DEFINITIONS.get(role)
        current      = getattr(agent_def, "system_prompt", "") if agent_def else ""

        prompt = f"""
El agente '{role}' de BusinessAIOS tiene una calidad degradada ({pred['predicted_quality']:.0%}).

System prompt actual:
{current[:500] if current else '(no configurado)'}

Genera un system prompt mejorado para este agente que:
1. Refuerce su especialización en {role}
2. Incluya instrucciones claras de formato de respuesta
3. Agregue guías para manejar casos ambiguos
4. Mejore la consistencia de las respuestas

Responde SOLO con el nuevo system prompt. Máximo 200 palabras. En español.
"""
        try:
            improved = await self.llm.generate(
                prompt=prompt,
                system_context="Eres un experto en optimización de agentes de IA. Genera prompts concisos y efectivos.",
            )
            personality_engine.update_personality(role, {"custom_instructions": improved.strip()})
            applied = True
        except Exception as e:
            improved = f"Error: {e}"
            applied  = False

        return {
            "action":       "heal_agent_prompt",
            "agent":        role,
            "applied":      applied,
            "quality_before": pred["predicted_quality"],
        }

    async def _count_recent_failures(self) -> int:
        if not self.db:
            return 0
        try:
            since = (datetime.utcnow() - timedelta(days=3)).isoformat()
            r = (self.db.table("executions").select("id", count="exact")
                 .eq("status", "failed").gte("created_at", since).execute())
            return r.count or 0
        except Exception:
            return 0

    async def _analyze_failure_patterns(self) -> dict:
        if not self.db:
            return {"action": "failure_analysis", "result": "no_db"}
        try:
            r = (self.db.table("executions").select("agent_used,error")
                 .eq("status", "failed").order("created_at", desc=True).limit(20).execute())
            failures = r.data or []
            by_agent: dict = {}
            for f in failures:
                ag = f.get("agent_used", "unknown")
                by_agent[ag] = by_agent.get(ag, 0) + 1
            worst = max(by_agent, key=lambda k: by_agent[k]) if by_agent else "unknown"
            return {
                "action":       "failure_pattern_analysis",
                "by_agent":     by_agent,
                "worst_agent":  worst,
                "recommendation": f"El agente '{worst}' tiene más fallos — revisa su API key y conexión",
            }
        except Exception as e:
            return {"action": "failure_analysis", "error": str(e)}

    async def _check_knowledge_stagnation(self) -> bool:
        if not self.db:
            return False
        try:
            since = (datetime.utcnow() - timedelta(days=7)).isoformat()
            r = (self.db.table("global_knowledge").select("id", count="exact")
                 .gte("created_at", since).execute())
            return (r.count or 0) == 0
        except Exception:
            return False

    async def _check_scheduler_health(self) -> bool:
        if not self.db:
            return True
        try:
            since = (datetime.utcnow() - timedelta(days=3)).isoformat()
            r = (self.db.table("scheduled_jobs").select("id", count="exact")
                 .gte("run_at", since).execute())
            return (r.count or 0) > 0
        except Exception:
            return True

    # ── 2. PROMPT OPTIMIZER ─────────────────────────────────

    async def optimize_all_prompts(self, dry_run: bool = True) -> dict:
        """
        Analiza y optimiza los prompts de todos los agentes
        basándose en patrones de éxito y fallo reales.

        dry_run=True → solo propone, no aplica
        dry_run=False → aplica automáticamente si confianza > threshold
        """
        results = []
        learning_result = await auto_learning.run_cycle(auto_apply=not dry_run)

        for improvement in learning_result.get("improvements", []):
            results.append({
                "agent":      improvement["agent_role"],
                "confidence": improvement["confidence"],
                "applied":    improvement.get("applied", False),
                "proposal":   improvement["proposed_improvement"][:120] + "...",
            })

        return {
            "type":         "prompt_optimization",
            "dry_run":      dry_run,
            "optimized":    len(results),
            "applied":      sum(1 for r in results if r["applied"]),
            "results":      results,
            "executed_at":  datetime.utcnow().isoformat(),
        }

    # ── 3. THRESHOLD TUNER ──────────────────────────────────

    async def tune_thresholds(self) -> dict:
        """
        Ajusta los umbrales del sistema basándose en
        datos reales de los últimos 30 días.
        """
        if not self.db:
            return {"status": "no_db", "thresholds": self.thresholds}

        try:
            r = (self.db.table("executions")
                 .select("quality_score,status")
                 .order("created_at", desc=True).limit(200).execute())
            execs = r.data or []
        except Exception:
            return {"status": "error", "thresholds": self.thresholds}

        if len(execs) < 20:
            return {"status": "insufficient_data", "thresholds": self.thresholds, "needed": 20}

        scores   = [float(e.get("quality_score") or 0) for e in execs if e.get("quality_score")]
        if not scores:
            return {"status": "no_scores", "thresholds": self.thresholds}

        # Calcular percentiles reales
        scores.sort()
        n        = len(scores)
        p25      = scores[n // 4]
        p50      = scores[n // 2]
        p75      = scores[3 * n // 4]

        # Ajustar umbrales basados en distribución real
        old = dict(self.thresholds)
        self.thresholds["min_quality"]             = round(max(0.50, p25), 2)
        self.thresholds["recovery_threshold"]      = round(min(0.90, p50 + 0.10), 2)
        self.thresholds["auto_apply_confidence"]   = round(min(0.92, 0.80 + (p75 - p50)), 2)

        changed = {k: {"old": old[k], "new": self.thresholds[k]}
                   for k in old if old[k] != self.thresholds.get(k)}

        audit_service.log("threshold_tuning", "auto_optimizer", "Thresholds adjusted",
                          {"changed": changed, "data_points": n})

        return {
            "type":        "threshold_tuning",
            "data_points": n,
            "percentiles": {"p25": p25, "p50": p50, "p75": p75},
            "changed":     changed,
            "thresholds":  self.thresholds,
            "executed_at": datetime.utcnow().isoformat(),
        }

    # ── 4. PERFORMANCE LOOP ──────────────────────────────────

    async def run_full_optimization_cycle(self) -> dict:
        """
        Ciclo completo de optimización — el más poderoso.
        Ejecuta en secuencia: tune → heal → optimize → report.

        Diseñado para correr semanalmente via APScheduler.
        """
        start   = time.time()
        results = {}

        logger.info("Full optimization cycle started")

        # Paso 1: Ajustar umbrales con datos reales
        results["threshold_tuning"] = await self.tune_thresholds()

        # Paso 2: Self-healing
        results["self_healing"]     = await self.self_heal()

        # Paso 3: Optimizar prompts
        results["prompt_optimization"] = await self.optimize_all_prompts(dry_run=False)

        elapsed = round(time.time() - start, 1)
        issues  = len(results["self_healing"].get("issues_found", []))
        applied = results["prompt_optimization"].get("applied", 0)

        summary = {
            "type":          "full_optimization_cycle",
            "executed_at":   datetime.utcnow().isoformat(),
            "elapsed_seconds": elapsed,
            "issues_healed": issues,
            "prompts_improved": applied,
            "system_grade":  results["self_healing"].get("system_grade", "unknown"),
            "details":       results,
        }

        event_bus.publish("auto_optimizer.cycle_complete", {
            "elapsed":  elapsed,
            "issues":   issues,
            "improved": applied,
            "grade":    summary["system_grade"],
        })

        logger.info(f"Full optimization complete in {elapsed}s — {issues} healed, {applied} prompts improved")
        return summary

    # ── 5. ESTADO DEL OPTIMIZER ─────────────────────────────

    async def get_status(self) -> dict:
        """Estado actual del motor de optimización."""
        if self.db:
            try:
                r = (self.db.table("optimization_reports")
                     .select("report,created_at").order("created_at", desc=True).limit(5).execute())
                recent = r.data or []
            except Exception:
                recent = []
        else:
            recent = []

        return {
            "thresholds":       self.thresholds,
            "recent_cycles":    len(recent),
            "last_cycle":       recent[0]["created_at"] if recent else None,
            "auto_learning":    {"enabled": True, "schedule": "Sundays 3AM UTC"},
            "self_healing":     {"enabled": True, "schedule": "On demand + weekly"},
            "prompt_optimizer": {"enabled": True, "auto_apply_threshold": self.thresholds["auto_apply_confidence"]},
            "threshold_tuner":  {"enabled": True, "schedule": "Weekly"},
        }

    async def get_history(self, limit: int = 10) -> list:
        if not self.db:
            return []
        try:
            r = (self.db.table("optimization_reports")
                 .select("*").order("created_at", desc=True).limit(limit).execute())
            return r.data or []
        except Exception:
            return []


auto_optimizer = AutoOptimizationEngine()
