# ============================================================
# BusinessAIOS - api/routes/scheduling.py
# Task scheduling endpoints
# ============================================================

from fastapi import APIRouter
from services.scheduling.scheduler import scheduler
from core.logger import get_logger

router = APIRouter(prefix="/scheduling", tags=["Scheduling"])
logger = get_logger("SchedulingRouter")


@router.get("/status", summary="Scheduler status")
async def scheduler_status():
    """Get scheduler status."""
    jobs = [
        {
            "id": job.id,
            "name": job.name,
            "trigger": str(job.trigger),
            "next_run": str(job.next_run_time),
        }
        for job in scheduler.get_jobs()
    ]
    return {
        "running": scheduler.running,
        "jobs": jobs,
        "scheduled_tasks": {
            "arbitrage_scan": "Daily @ 2 AM UTC",
            "neuro_prediction": "Daily @ 6 AM UTC",
        },
    }
