# ============================================================
# BusinessAIOS - services/scheduling/scheduler.py
# APScheduler for background tasks
# ============================================================

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from core.config import settings
from core.logger import get_logger
from services.neuro.auto_learning import auto_learning

logger = get_logger("Scheduler")

scheduler = AsyncIOScheduler()


async def scheduled_arbitrage_scan():
    """Daily arbitrage scan at 2 AM UTC."""
    from services.ecommerce.arbitrage.arbitrage_agent import arbitrage_agent
    from services.ecommerce.arbitrage.neuro_profile import neuro_profile
    from services.webhooks.webhook_service import webhook_service

    logger.info("🔄 Starting scheduled arbitrage scan...")

    categories = ["Electronics", "Home", "Sports", "Fashion", "Beauty"]
    
    for category in categories:
        try:
            result = await arbitrage_agent.scan_category(
                category=category,
                subcategory="Accessories",
                limit=15,
            )
            
            await neuro_profile.record_scan(category, result)
            
            high_roi = [
                o for o in result.get("opportunities", [])
                if o["financials"]["roi_percent"] > 200
            ]
            
            if high_roi:
                await webhook_service.send_webhook(
                    event="arbitrage.opportunities_found",
                    data={
                        "category": category,
                        "count": len(high_roi),
                        "best_roi": max(o["financials"]["roi_percent"] for o in high_roi),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
                logger.info(f"✅ Found {len(high_roi)} opportunities in {category}")
        except Exception as e:
            logger.error(f"Scan error [{category}]: {e}")


async def scheduled_neuro_prediction():
    """Daily prediction at 6 AM UTC."""
    from services.ecommerce.arbitrage.neuro_profile import neuro_profile
    from services.webhooks.webhook_service import webhook_service

    logger.info("🧠 Generating predictions...")
    
    try:
        prediction = await neuro_profile.predict_next_best_category()
        
        if prediction.get("prediction"):
            await webhook_service.send_webhook(
                event="neuro.prediction",
                data={"prediction": prediction, "timestamp": datetime.utcnow().isoformat()}
            )
            logger.info(f"✅ Prediction: {prediction['prediction']}")
    except Exception as e:
        logger.error(f"Prediction error: {e}")


def start_scheduler():
    """Start background scheduler."""
    if scheduler.running:
        return
    
    scheduler.add_job(
        scheduled_arbitrage_scan,
        CronTrigger(hour=2, minute=0),
        id="arbitrage_scan",
    )
    
    scheduler.add_job(
        scheduled_neuro_prediction,
        CronTrigger(hour=6, minute=0),
        id="neuro_prediction",
    )
    
    
    # Auto-learning: ciclo semanal los domingos a las 3 AM
    if settings.DEEPSEEK_API_KEY or settings.GEMINI_API_KEY:
        scheduler.add_job(
            func=lambda: asyncio.create_task(auto_learning.run_cycle(auto_apply=False)),
            trigger="cron",
            day_of_week="sun",
            hour=3,
            minute=0,
            id="weekly_auto_learning",
            replace_existing=True,
        )
        logger.info("Scheduled: weekly_auto_learning (Sun 3 AM)")

    
    # Auto-Optimization: ciclo completo cada sábado a las 4 AM
    try:
        from services.neuro.auto_optimizer import auto_optimizer
        scheduler.add_job(
            func=lambda: asyncio.create_task(auto_optimizer.run_full_optimization_cycle()),
            trigger="cron",
            day_of_week="sat",
            hour=4, minute=0,
            id="weekly_auto_optimization",
            replace_existing=True,
        )
        logger.info("Scheduled: weekly_auto_optimization (Sat 4 AM)")
    except Exception as e:
        logger.warning(f"Could not schedule auto_optimizer: {e}")

    scheduler.start()
    logger.info("✅ Scheduler: scan @ 2 AM UTC, predict @ 6 AM UTC")
