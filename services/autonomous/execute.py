# ============================================================
# BusinessAIOS - services/autonomous/execute.py
# UPGRADED: routes to correct engine based on plan
# ============================================================

from core.logger import get_logger

logger = get_logger("ExecutePhase")


class ExecutePhase:
    """
    Routes execution to the correct engine based on the plan mode.
    Bridges autonomous loop → execution/delegation engines.
    """

    async def run(self, task_id: str, plan: dict) -> dict:
        mode = plan.get("mode", "collaboration")
        logger.info(f"ExecutePhase | task={task_id} mode={mode}")

        from services.execution.execution_engine import ExecutionEngine
        engine = ExecutionEngine()

        if mode == "delegation":
            from services.delegation.delegation_engine import DelegationEngine
            deleg = DelegationEngine()
            # For delegation we need the task description
            db_task = await engine._get_task(task_id)
            if not db_task:
                raise ValueError(f"Task {task_id} not found for delegation")
            return await deleg.execute_delegation(
                objective=db_task.get("description", db_task.get("title", "")),
            )

        use_collab = (mode == "collaboration")
        return await engine.execute(task_id=task_id, use_collaboration=use_collab)
