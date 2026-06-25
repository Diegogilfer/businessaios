# ============================================================
# BusinessAIOS - Growth Engine / GEO (Blueprint 2026-2028)
# Optimiza: adquisición, activación, retención, monetización
# ============================================================
from datetime import datetime, timedelta
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("GrowthEngine")

class GrowthEngine:
    """
    GEO — Growth Executive Officer.
    Analiza métricas del sistema y genera recomendaciones accionables
    para maximizar el LTV y reducir churn.
    """

    def __init__(self):
        try:
            self.db = get_supabase()
        except Exception:
            self.db = None

    def get_growth_report(self) -> dict:
        """Reporte completo de crecimiento con recomendaciones."""
        metrics = self._collect_metrics()
        recs    = self._generate_recommendations(metrics)
        return {
            "generated_at":    datetime.utcnow().isoformat(),
            "metrics":         metrics,
            "recommendations": recs,
            "health_grade":    self._grade(metrics),
        }

    def _collect_metrics(self) -> dict:
        m: dict = {}
        if not self.db:
            return {"error": "Supabase no disponible"}
        try:
            tasks = self.db.table("tasks").select("status,created_at").execute().data or []
            m["total_tasks"]     = len(tasks)
            m["completed_tasks"] = sum(1 for t in tasks if t["status"] == "completed")
            m["failed_tasks"]    = sum(1 for t in tasks if t["status"] == "failed")
            m["completion_rate"] = round(m["completed_tasks"] / max(m["total_tasks"], 1) * 100, 1)

            execs = self.db.table("executions").select("quality_score,execution_time_seconds").execute().data or []
            m["avg_quality"]     = round(sum(e.get("quality_score", 0) or 0 for e in execs) / max(len(execs), 1), 2)
            m["avg_exec_time"]   = round(sum(e.get("execution_time_seconds", 0) or 0 for e in execs) / max(len(execs), 1), 1)

            knowledge = self.db.table("global_knowledge").select("id").execute().data or []
            m["knowledge_entries"] = len(knowledge)

            convs = self.db.table("conversations").select("id,created_at").execute().data or []
            m["total_conversations"] = len(convs)

            opps = self.db.table("arbitrage_opportunities").select("viable,roi_percent").execute().data or []
            viable = [o for o in opps if o.get("viable")]
            m["viable_opportunities"] = len(viable)
            m["avg_roi"] = round(sum(o.get("roi_percent", 0) or 0 for o in viable) / max(len(viable), 1), 1)
        except Exception as e:
            m["collection_error"] = str(e)
        return m

    def _generate_recommendations(self, m: dict) -> list[dict]:
        recs = []
        cr = m.get("completion_rate", 100)
        aq = m.get("avg_quality", 1)

        if cr < 80:
            recs.append({"priority": "high", "area": "reliability",
                "issue": f"Tasa de completación baja: {cr}%",
                "action": "Revisa los logs de tareas fallidas. Verifica la API key del LLM y la conexión a Supabase."})
        if aq < 0.7:
            recs.append({"priority": "high", "area": "quality",
                "issue": f"Quality score promedio bajo: {aq}",
                "action": "Mejora los prompts del sistema de los agentes. Activa colaboración multi-agente en más tareas."})
        if m.get("knowledge_entries", 0) < 10:
            recs.append({"priority": "medium", "area": "learning",
                "issue": "Base de conocimiento escasa",
                "action": "Ejecuta al menos 20 tareas para que el sistema empiece a aprender patrones."})
        if m.get("viable_opportunities", 0) == 0:
            recs.append({"priority": "medium", "area": "revenue",
                "issue": "Arbitrage Engine sin datos",
                "action": "Configura AMAZON_CLIENT_ID y ALIEXPRESS_APP_KEY para activar el scanner de oportunidades."})
        if m.get("total_conversations", 0) < 5:
            recs.append({"priority": "low", "area": "engagement",
                "issue": "Bajo uso del chat con agentes",
                "action": "Usa el tab 💬 Chat para consultas rápidas. Los agentes recuerdan el contexto y mejoran con cada conversación."})
        if not recs:
            recs.append({"priority": "info", "area": "general",
                "issue": "Sistema en buen estado",
                "action": "Considera activar el Arbitrage Engine y configurar webhooks para notificaciones automáticas."})
        return sorted(recs, key=lambda r: {"high":0,"medium":1,"low":2,"info":3}[r["priority"]])

    def _grade(self, m: dict) -> str:
        score = 0
        if m.get("completion_rate", 0) >= 90: score += 30
        elif m.get("completion_rate", 0) >= 70: score += 15
        if m.get("avg_quality", 0) >= 0.8: score += 30
        elif m.get("avg_quality", 0) >= 0.6: score += 15
        if m.get("knowledge_entries", 0) >= 50: score += 20
        elif m.get("knowledge_entries", 0) >= 10: score += 10
        if m.get("viable_opportunities", 0) >= 5: score += 20
        elif m.get("viable_opportunities", 0) >= 1: score += 10
        if score >= 80: return "A"
        if score >= 60: return "B"
        if score >= 40: return "C"
        return "D"

growth_engine = GrowthEngine()
