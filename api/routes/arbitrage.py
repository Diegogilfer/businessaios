# ============================================================
# BusinessAIOS - api/routes/arbitrage.py
# FASE 10+ — Cross-border arbitrage endpoints
# ============================================================

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime
from services.ecommerce.arbitrage.arbitrage_agent import arbitrage_agent
from services.ecommerce.arbitrage.neuro_profile import neuro_profile
from core.logger import get_logger

router = APIRouter(prefix="/arbitrage", tags=["Arbitrage (FASE 10+)"])
logger = get_logger("ArbitrageRouter")


class ArbitrageScanRequest(BaseModel):
    category: str = "Electronics"
    subcategory: str = "Accessories"
    limit: int = 20


@router.post("/scan", summary="Scan for arbitrage opportunities")
async def scan_opportunities(data: ArbitrageScanRequest, background_tasks: BackgroundTasks):
    """
    Scan Amazon best-sellers vs AliExpress suppliers.
    Returns opportunities ranked by ROI.
    
    Automatically learns patterns for future predictions.
    """
    try:
        result = await arbitrage_agent.scan_category(
            category=data.category,
            subcategory=data.subcategory,
            limit=data.limit,
        )
        
        # Background: record for learning
        background_tasks.add_task(
            neuro_profile.record_scan,
            data.category,
            result
        )
        
        return result
    except Exception as e:
        logger.error(f"Scan error: {e}")
        raise HTTPException(500, str(e))


@router.get("/predict", summary="Predict best category for tomorrow")
async def predict_best_category():
    """Predict which category will have best arbitrage opportunities."""
    prediction = await neuro_profile.predict_next_best_category()
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "prediction": prediction,
    }


@router.get("/insights/{category}", summary="Get category insights (7-day trend)")
async def get_insights(category: str):
    """Get trend analysis for a category."""
    insights = await neuro_profile.get_category_insights(category)
    return insights


@router.get("/status", summary="Arbitrage system status")
async def arbitrage_status():
    """Check if arbitrage APIs are configured."""
    return {
        "amazon_configured": False,  # Check if credentials exist
        "aliexpress_configured": False,
        "message": "Configure Amazon SP-API and AliExpress credentials in .env",
        "docs": "See ARBITRAGE.md for setup instructions",
    }
