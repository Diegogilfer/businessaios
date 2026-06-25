# ============================================================
# BusinessAIOS - services/queue/task_queue.py
# FASE 6.3 — In-process async task queue
# Lightweight alternative to ARQ/Celery for single-server setups
# Upgrade path: swap _worker for ARQ worker with zero API changes
# ============================================================

import asyncio
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any
from core.logger import get_logger
from services.events.event_bus import event_bus
from services.events.event_types import EventType

logger = get_logger("TaskQueue")


@dataclass
class QueuedJob:
    job_id: str
    task_id: str
    use_collaboration: bool = True
    use_autonomous: bool = False
    queued_at: float = field(default_factory=time.time)
    status: str = "queued"          # queued | running | done | failed
    result: dict | None = None
    error: str | None = None


class TaskQueue:
    """
    FASE 6.3 — Async task queue backed by asyncio.
    Decouples HTTP request from execution — prevents timeouts.

    Usage:
        job_id = await queue.enqueue(task_id="uuid", use_collaboration=True)
        # Client polls GET /queue/{job_id} or subscribes via WebSocket
    """

    def __init__(self, max_concurrent: int = 3):
        self._queue: deque[QueuedJob] = deque()
        self._jobs: dict[str, QueuedJob] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._running = False
        self._worker_task: asyncio.Task | None = None

    def start(self):
        """Start the background worker. Call from FastAPI startup."""
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._worker())
            logger.info("TaskQueue worker started")

    def stop(self):
        """Stop the background worker. Call from FastAPI shutdown."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
        logger.info("TaskQueue worker stopped")

    async def enqueue(
        self,
        task_id: str,
        use_collaboration: bool = True,
        use_autonomous: bool = False,
    ) -> str:
        """Add a task to the queue. Returns job_id."""
        import uuid
        job_id = str(uuid.uuid4())
        job = QueuedJob(
            job_id=job_id,
            task_id=task_id,
            use_collaboration=use_collaboration,
            use_autonomous=use_autonomous,
        )
        self._queue.append(job)
        self._jobs[job_id] = job

        event_bus.publish(EventType.TASK_QUEUED, {
            "task_id": task_id,
            "job_id": job_id,
            "queue_size": len(self._queue),
        })

        logger.info(f"Task queued | job={job_id} task={task_id}")
        return job_id

    def get_job(self, job_id: str) -> QueuedJob | None:
        return self._jobs.get(job_id)

    def queue_status(self) -> dict:
        all_jobs = list(self._jobs.values())
        return {
            "pending": sum(1 for j in all_jobs if j.status == "queued"),
            "running": sum(1 for j in all_jobs if j.status == "running"),
            "done":    sum(1 for j in all_jobs if j.status == "done"),
            "failed":  sum(1 for j in all_jobs if j.status == "failed"),
            "total":   len(all_jobs),
        }

    async def _worker(self):
        """Background loop — drains the queue."""
        while self._running:
            if self._queue:
                job = self._queue.popleft()
                asyncio.create_task(self._run_job(job))
            else:
                await asyncio.sleep(0.5)

    async def _run_job(self, job: QueuedJob):
        async with self._semaphore:
            job.status = "running"
            logger.info(f"Queue executing job={job.job_id} task={job.task_id}")

            try:
                if job.use_autonomous:
                    from services.autonomous.autonomous_loop import AutonomousLoop
                    from core.database import get_supabase
                    db = get_supabase()
                    resp = db.table("tasks").select("title,description").eq("id", job.task_id).execute()
                    task_data = resp.data[0] if resp.data else {}
                    loop = AutonomousLoop()
                    result = await loop.run(
                        task_id=job.task_id,
                        title=task_data.get("title", ""),
                        description=task_data.get("description", ""),
                    )
                else:
                    from services.execution.execution_engine import ExecutionEngine
                    engine = ExecutionEngine()
                    result = await engine.execute(
                        task_id=job.task_id,
                        use_collaboration=job.use_collaboration,
                    )

                job.result = result
                job.status = "done"
                logger.info(f"Queue job done | job={job.job_id}")

            except Exception as e:
                job.error = str(e)
                job.status = "failed"
                logger.error(f"Queue job failed | job={job.job_id}: {e}")


task_queue = TaskQueue()
