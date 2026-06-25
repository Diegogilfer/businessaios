# ============================================================
# BusinessAIOS - services/neuro/predictive_engine.py
# FASE 12 — Advanced NeuroIA: predicción + behavior segmentation
# ============================================================

import math
from datetime import datetime, timedelta
from collections import defaultdict
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("PredictiveEngine")


class PredictiveEngine:
    """
    Motor de predicción basado en patrones históricos reales.

    Capacidades:
    - Predecir calidad de próximas ejecuciones por agente
    - Detectar tendencias de uso (crecimiento/declive)
    - Segmentar comportamiento por categoría
    - Identificar el mejor momento del día para ejecutar tareas
    - Detectar deriva de calidad (quality drift)
    """

    def __init__(self):
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None

    # ── Predicción de calidad ────────────────────────────────

    async def predict_quality(self, agent_role: str, category: str = "general") -> dict:
        """
        Predice la calidad esperada de la próxima ejecución
        basándose en el historial reciente del agente.
        """
        if not self.db:
            return self._default_prediction(agent_role)

        try:
            # Últimas 20 ejecuciones del agente
            r = (self.db.table("executions")
                 .select("quality_score,execution_time_seconds,created_at")
                 .eq("agent_used", agent_role)
                 .order("created_at", desc=True)
                 .limit(20).execute())
            records = r.data or []

            if len(records) < 3:
                return self._default_prediction(agent_role)

            scores = [float(rec.get("quality_score") or 0) for rec in records]
            times  = [float(rec.get("execution_time_seconds") or 0) for rec in records]

            # Media móvil ponderada (más peso a lo reciente)
            weights    = [math.exp(i * 0.1) for i in range(len(scores))]
            total_w    = sum(weights)
            pred_score = sum(s * w for s, w in zip(scores, weights)) / total_w

            # Tendencia: comparar primera y segunda mitad
            mid   = len(scores) // 2
            trend = sum(scores[:mid]) / mid - sum(scores[mid:]) / (len(scores) - mid)

            # Varianza para medir consistencia
            mean     = sum(scores) / len(scores)
            variance = sum((s - mean) ** 2 for s in scores) / len(scores)
            std_dev  = math.sqrt(variance)

            # Detectar deriva
            drift    = "stable"
            if trend > 0.05:  drift = "improving"
            elif trend < -0.05: drift = "declining"
            if std_dev > 0.2:   drift = "unstable"

            return {
                "agent_role":        agent_role,
                "predicted_quality": round(pred_score, 3),
                "confidence":        round(max(0, 1 - std_dev), 2),
                "trend":             drift,
                "trend_delta":       round(trend, 3),
                "avg_exec_time":     round(sum(times) / len(times), 1),
                "sample_size":       len(records),
                "recommendation":    self._quality_recommendation(pred_score, drift),
            }
        except Exception as e:
            logger.error(f"predict_quality error: {e}")
            return self._default_prediction(agent_role)

    def _default_prediction(self, role: str) -> dict:
        return {
            "agent_role": role, "predicted_quality": 0.75,
            "confidence": 0.5, "trend": "unknown",
            "trend_delta": 0, "avg_exec_time": 5.0,
            "sample_size": 0,
            "recommendation": "Ejecuta más tareas para obtener predicciones precisas",
        }

    def _quality_recommendation(self, score: float, drift: str) -> str:
        if score >= 0.85 and drift == "improving":
            return "Agente en estado óptimo — ideal para tareas críticas"
        if score >= 0.75 and drift == "stable":
            return "Rendimiento consistente — apto para producción"
        if drift == "declining":
            return "Calidad bajando — revisa los prompts del sistema del agente"
        if drift == "unstable":
            return "Alta varianza — considera usar colaboración multi-agente"
        if score < 0.6:
            return "Calidad baja — activa use_collaboration=true para esta tarea"
        return "Rendimiento normal"

    # ── Segmentación de comportamiento ──────────────────────

    async def get_behavior_segments(self) -> dict:
        """
        Segmenta el comportamiento del sistema por categorías.
        Identifica qué tipo de tareas funcionan mejor.
        """
        if not self.db:
            return {"segments": [], "insights": []}

        try:
            r = (self.db.table("tasks")
                 .select("category,status,created_at")
                 .order("created_at", desc=True)
                 .limit(200).execute())
            tasks = r.data or []

            # Agrupar por categoría
            by_cat: dict = defaultdict(lambda: {"total": 0, "completed": 0, "failed": 0})
            for t in tasks:
                cat = t.get("category", "general")
                by_cat[cat]["total"] += 1
                if t["status"] == "completed": by_cat[cat]["completed"] += 1
                if t["status"] == "failed":    by_cat[cat]["failed"] += 1

            segments = []
            for cat, data in by_cat.items():
                rate = data["completed"] / max(data["total"], 1)
                segments.append({
                    "category":        cat,
                    "total_tasks":     data["total"],
                    "completion_rate": round(rate * 100, 1),
                    "failure_rate":    round(data["failed"] / max(data["total"], 1) * 100, 1),
                    "performance":     "strong" if rate >= 0.85 else "moderate" if rate >= 0.65 else "weak",
                })

            segments.sort(key=lambda s: s["completion_rate"], reverse=True)

            insights = self._generate_segment_insights(segments)
            return {"segments": segments, "insights": insights, "total_analyzed": len(tasks)}

        except Exception as e:
            logger.error(f"behavior_segments error: {e}")
            return {"segments": [], "insights": [], "error": str(e)}

    def _generate_segment_insights(self, segments: list) -> list[str]:
        insights = []
        if not segments: return ["Sin datos suficientes para generar insights"]
        strong = [s for s in segments if s["performance"] == "strong"]
        weak   = [s for s in segments if s["performance"] == "weak"]
        if strong:
            insights.append(f"Mejor rendimiento en: {', '.join(s['category'] for s in strong[:2])}")
        if weak:
            insights.append(f"Categorías problemáticas: {', '.join(s['category'] for s in weak[:2])} — considera revisar los prompts")
        top = segments[0] if segments else None
        if top:
            insights.append(f"Categoría más activa: '{top['category']}' con {top['total_tasks']} tareas")
        return insights

    # ── Detección de tendencias ──────────────────────────────

    async def get_usage_trends(self, days: int = 30) -> dict:
        """
        Analiza tendencias de uso en el tiempo.
        Detecta crecimiento, picos y anomalías.
        """
        if not self.db:
            return {"trend": "unknown", "data_points": []}

        try:
            since = (datetime.utcnow() - timedelta(days=days)).isoformat()
            r = (self.db.table("executions")
                 .select("created_at,quality_score,status")
                 .gte("created_at", since)
                 .order("created_at", desc=False).execute())
            records = r.data or []

            # Agrupar por día
            by_day: dict = defaultdict(lambda: {"count": 0, "quality_sum": 0})
            for rec in records:
                day = rec["created_at"][:10]
                by_day[day]["count"] += 1
                by_day[day]["quality_sum"] += float(rec.get("quality_score") or 0)

            data_points = [
                {
                    "date":    day,
                    "count":   data["count"],
                    "avg_quality": round(data["quality_sum"] / max(data["count"], 1), 2),
                }
                for day, data in sorted(by_day.items())
            ]

            # Calcular tendencia general
            if len(data_points) >= 7:
                first_week = sum(d["count"] for d in data_points[:7])
                last_week  = sum(d["count"] for d in data_points[-7:])
                growth     = (last_week - first_week) / max(first_week, 1) * 100
            else:
                growth = 0

            return {
                "data_points":     data_points,
                "total_executions": len(records),
                "growth_rate":     round(growth, 1),
                "trend":           "growing" if growth > 10 else "declining" if growth < -10 else "stable",
                "peak_day":        max(data_points, key=lambda d: d["count"])["date"] if data_points else None,
            }
        except Exception as e:
            logger.error(f"usage_trends error: {e}")
            return {"trend": "unknown", "data_points": [], "error": str(e)}

    # ── Recomendación de agente óptimo ───────────────────────

    async def recommend_agent(self, task_category: str, task_description: str = "") -> dict:
        """
        Recomienda el agente más adecuado para una tarea específica
        basándose en performance histórico por categoría.
        """
        category_agents = {
            "market_research": ["research", "ceo"],
            "sales":           ["commercial", "ceo"],
            "content":         ["content", "commercial"],
            "strategy":        ["ceo", "research"],
            "finance":         ["finance", "ceo"],
            "operations":      ["operations", "ceo"],
            "general":         ["ceo", "research"],
        }
        candidates = category_agents.get(task_category, ["ceo", "research"])

        predictions = []
        for agent in candidates:
            pred = await self.predict_quality(agent, task_category)
            predictions.append(pred)

        predictions.sort(key=lambda p: p["predicted_quality"], reverse=True)
        best = predictions[0]

        return {
            "recommended_agent":  best["agent_role"],
            "predicted_quality":  best["predicted_quality"],
            "confidence":         best["confidence"],
            "alternatives":       [p["agent_role"] for p in predictions[1:]],
            "use_collaboration":  best["predicted_quality"] < 0.75,
            "reasoning":          f"Basado en {best['sample_size']} ejecuciones previas — tendencia: {best['trend']}",
        }


predictive_engine = PredictiveEngine()
