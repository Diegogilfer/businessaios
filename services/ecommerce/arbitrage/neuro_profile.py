# ============================================================
# BusinessAIOS - services/ecommerce/arbitrage/neuro_profile.py
# UPGRADED: Advanced predictions + seasonality + risk
# ============================================================

from datetime import datetime, timedelta
from collections import defaultdict
from core.logger import get_logger
from core.database import get_supabase

logger = get_logger("NeuroProfile")


class NeuroProfile:
    """Advanced learning from arbitrage scans."""

    def __init__(self):
        self.db = get_supabase()

    async def record_scan(self, category: str, scan_result: dict):
        """Record scan for learning."""
        try:
            self.db.table("neuro_profiles").insert({
                "category": category,
                "scan_timestamp": datetime.utcnow().isoformat(),
                "total_opportunities": scan_result.get("total_opportunities"),
                "avg_roi": scan_result.get("stats", {}).get("avg_roi"),
                "avg_margin": scan_result.get("stats", {}).get("avg_margin"),
                "high_risk_count": scan_result.get("stats", {}).get("high_risk_count"),
            }).execute()
            logger.info(f"Scan recorded: {category}")
        except Exception as e:
            logger.warning(f"Record error: {e}")

    async def predict_next_best_category(self) -> dict:
        """Predict best category for next scan."""
        try:
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            resp = self.db.table("neuro_profiles").select(
                "category, avg_roi, total_opportunities"
            ).gt("scan_timestamp", week_ago).execute()

            if not resp.data:
                return {"prediction": None}

            categories = defaultdict(list)
            for row in resp.data:
                categories[row["category"]].append(row["avg_roi"])

            scores = {}
            for cat, rois in categories.items():
                avg_roi = sum(rois) / len(rois)
                consistency = 1 - (max(rois) - min(rois)) / max(rois) if rois else 0
                scores[cat] = avg_roi * consistency * 0.8 + avg_roi * 0.2

            best = max(scores, key=scores.get) if scores else None
            return {
                "prediction": best,
                "confidence": round(scores.get(best, 0) / 100, 2),
                "categories_tracked": len(categories),
            }
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {}

    async def get_category_trend(self, category: str) -> dict:
        """7-day trend for category."""
        try:
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            resp = self.db.table("neuro_profiles").select(
                "avg_roi, avg_margin, total_opportunities"
            ).eq("category", category).gt("scan_timestamp", week_ago).execute()

            if not resp.data:
                return {"category": category, "trend": "NO_DATA"}

            rois = [r["avg_roi"] for r in resp.data if r["avg_roi"]]
            trend = "UP" if len(rois) > 1 and rois[-1] > rois[0] else "DOWN"

            return {
                "category": category,
                "avg_roi_7d": round(sum(rois) / len(rois), 1),
                "data_points": len(resp.data),
                "trend": trend,
            }
        except Exception as e:
            logger.error(f"Trend error: {e}")
            return {}

    async def get_risk_forecast(self, category: str) -> dict:
        """Forecast risk level for category."""
        try:
            trend = await self.get_category_trend(category)
            if "trend" not in trend:
                return {"category": category, "risk": "UNKNOWN"}

            risk = "LOW" if trend["trend"] == "UP" else "MEDIUM"
            confidence = 0.7 if trend["data_points"] > 3 else 0.4

            return {
                "category": category,
                "risk_level": risk,
                "confidence": confidence,
            }
        except Exception as e:
            return {}


neuro_profile = NeuroProfile()
