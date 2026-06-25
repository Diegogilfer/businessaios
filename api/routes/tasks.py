# ============================================================
# BusinessAIOS - api/routes/tasks.py
# Task CRUD + unified /execute endpoint
# FIX: /execute declarado ANTES de /{task_id} para evitar
#      que FastAPI lo interprete como parámetro UUID
# ============================================================

from fastapi import APIRouter, HTTPException, Query
from models.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    ExecuteTaskRequest, TaskStatus, KnowledgeCategory
)
from services.execution.execution_engine import ExecutionEngine
from core.database import get_supabase
from core.logger import get_logger
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["Tasks"])
logger = get_logger("TasksRouter")
engine = ExecutionEngine()


# ── /execute debe ir ANTES de /{task_id} ─────────────────────

@router.post("/execute", response_model=dict, summary="★ Execute a task")
async def execute_task(data: ExecuteTaskRequest):
    """
    **Endpoint unificado de ejecución.**

    Modos disponibles:
    - `use_collaboration=true` *(recomendado)*: Research + Commercial + Content analizan
      en paralelo → CEO consolida resultado final.
    - `use_collaboration=false`: Ejecución directa por un solo agente.

    **Flujo interno:**
    1. Carga la task desde Supabase
    2. Cambia status → `running`
    3. Ejecuta agentes (colaborativo o individual)
    4. Calcula quality score
    5. Guarda memoria en `agent_memories`
    6. Si quality >= 0.6 → guarda en `global_knowledge`
    7. Actualiza task → `completed` con resultado
    8. Retorna resultado completo

    **Ejemplo de body:**
    ```json
    {
      "task_id": "uuid-de-tu-task",
      "use_collaboration": true
    }
    ```
    """
    try:
        logger.info(
            f"[/execute] task={data.task_id} | "
            f"collaboration={data.use_collaboration}"
        )
        result = await engine.execute_task(
            task_id=data.task_id,
            use_collaboration=data.use_collaboration,
        )

        # Enriquecer respuesta con metadata útil
        result["_meta"] = {
            "endpoint": "POST /tasks/execute",
            "collaboration_mode": data.use_collaboration,
            "timestamp": datetime.utcnow().isoformat(),
        }

        return result

    except Exception as e:
        logger.error(f"[/execute] Error: {e}")
        raise HTTPException(status_code=500, detail={
            "error": str(e),
            "task_id": data.task_id,
            "hint": "Verifica que el task_id existe y que GEMINI_API_KEY está configurado en .env"
        })


# ── Task CRUD ─────────────────────────────────────────────────

@router.post("/", status_code=201, summary="Crear nueva task")
async def create_task(data: TaskCreate):
    """Crea una nueva tarea y la deja en estado `pending`."""
    try:
        db = get_supabase()
        payload = {
            "title": data.title,
            "description": data.description,
            "status": "pending",
            "priority": data.priority,
            "category": data.category.value if data.category else "general",
            "created_at": datetime.utcnow().isoformat(),
        }
        if data.project_id:
            payload["project_id"] = data.project_id
        if data.agent_id:
            payload["agent_id"] = data.agent_id

        response = db.table("tasks").insert(payload).execute()
        if not response.data:
            raise HTTPException(500, "Failed to create task")

        task = response.data[0]
        logger.info(f"Task creada: {task['id']} — {data.title}")
        return {
            "message": "Task creada exitosamente",
            "task": task,
            "next_step": f"POST /tasks/execute con task_id: {task['id']}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create task error: {e}")
        raise HTTPException(500, str(e))


@router.get("/", summary="Listar todas las tasks")
async def list_tasks(
    status: str | None = Query(None, description="Filtrar por: pending, running, completed, failed"),
    category: str | None = Query(None, description="Filtrar por categoría"),
    limit: int = Query(20, ge=1, le=100),
):
    """Lista tasks con filtros opcionales."""
    try:
        db = get_supabase()
        query = (
            db.table("tasks")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if status:
            query = query.eq("status", status)
        if category:
            query = query.eq("category", category)

        response = query.execute()
        tasks = response.data or []

        return {
            "total": len(tasks),
            "tasks": tasks,
            "filters": {"status": status, "category": category},
        }
    except Exception as e:
        logger.error(f"List tasks error: {e}")
        raise HTTPException(500, str(e))


@router.get("/{task_id}", summary="Obtener task por ID")
async def get_task(task_id: str):
    """Retorna una task específica con su resultado si ya ejecutó."""
    try:
        db = get_supabase()
        response = db.table("tasks").select("*").eq("id", task_id).execute()
        if not response.data:
            raise HTTPException(404, f"Task '{task_id}' no encontrada")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/{task_id}", summary="Actualizar task")
async def update_task(task_id: str, data: TaskUpdate):
    """Actualiza el status o resultado de una task manualmente."""
    try:
        db = get_supabase()
        payload = {"updated_at": datetime.utcnow().isoformat()}
        if data.status:
            payload["status"] = data.status.value
        if data.result:
            payload["result"] = data.result

        response = db.table("tasks").update(payload).eq("id", task_id).execute()
        if not response.data:
            raise HTTPException(404, f"Task '{task_id}' no encontrada")
        return {"message": "Task actualizada", "task": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/{task_id}", summary="Eliminar task")
async def delete_task(task_id: str):
    """Elimina una task permanentemente."""
    try:
        db = get_supabase()
        db.table("tasks").delete().eq("id", task_id).execute()
        logger.info(f"Task eliminada: {task_id}")
        return {"message": f"Task '{task_id}' eliminada"}
    except Exception as e:
        raise HTTPException(500, str(e))
