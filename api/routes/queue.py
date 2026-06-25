# ============================================================
# BusinessAIOS - api/routes/queue.py
# FASE 6.3 — Task Queue endpoints
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.queue.task_queue import task_queue
from core.logger import get_logger

router = APIRouter(prefix="/queue", tags=["Task Queue (FASE 6.3)"])
logger = get_logger("QueueRouter")


class EnqueueRequest(BaseModel):
    task_id: str
    use_collaboration: bool = True
    use_autonomous: bool = False


@router.post("/enqueue", summary="Enqueue a task for async execution")
async def enqueue_task(data: EnqueueRequest):
    """
    Queue a task for background execution.
    Returns immediately with a job_id.
    Poll GET /queue/{job_id} or subscribe to WS /ws/{task_id} for results.
    """
    job_id = await task_queue.enqueue(
        task_id=data.task_id,
        use_collaboration=data.use_collaboration,
        use_autonomous=data.use_autonomous,
    )
    return {
        "job_id": job_id,
        "task_id": data.task_id,
        "status": "queued",
        "message": f"Task queued. Track via GET /queue/{job_id} or WS /ws/{data.task_id}",
    }


@router.get("/{job_id}", summary="Get job status and result")
async def get_job_status(job_id: str):
    """Poll for job completion. Status: queued | running | done | failed."""
    job = task_queue.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")
    return {
        "job_id": job.job_id,
        "task_id": job.task_id,
        "status": job.status,
        "result": job.result,
        "error": job.error,
        "queued_at": job.queued_at,
    }


@router.get("/", summary="Queue status overview")
async def queue_status():
    """Returns counts of pending/running/done/failed jobs."""
    return task_queue.queue_status()
