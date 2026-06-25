# ============================================================
# BusinessAIOS - services/execution/execution_engine.py
# UPGRADED: RAG context injection + tool support
# ============================================================

import time
from datetime import datetime
from services.providers.llm_provider import get_llm_provider
from services.collaboration.collaboration_engine import CollaborationEngine
from services.memory.memory_service import MemoryService
from services.knowledge.knowledge_service import KnowledgeService
from services.rag.rag_context import rag_context
from services.agents.agent_definitions import get_agent_definition
from core.database import get_supabase
from core.logger import get_logger

logger = get_logger("ExecutionEngine")


class ExecutionEngine:
    """
    Core execution engine — NOW with RAG context injection.
    Agents receive semantic knowledge context, not just category-based.
    """

    def __init__(self):
        self.llm = get_llm_provider()
        self.collaboration = CollaborationEngine(self.llm)
        self.memory = MemoryService()
        self.knowledge = KnowledgeService()
        logger.info("ExecutionEngine initialized with RAG support")

    async def execute(
        self,
        task_id: str,
        use_collaboration: bool = True,
    ) -> dict:
        """Main execution entry point."""
        start_time = time.time()
        logger.info(f"Executing task: {task_id} | collaboration={use_collaboration}")

        # Load task
        task = await self._get_task(task_id)
        if not task:
            return self._error_result(task_id, "Task not found")

        # Update status
        await self._update_task_status(task_id, "running")

        try:
            if use_collaboration:
                result = await self._execute_collaborative(task)
            else:
                result = await self._execute_single_agent(task)

            elapsed = round(time.time() - start_time, 2)
            result["execution_time_seconds"] = elapsed

            # Quality score
            quality_score = self._calculate_quality_score(result.get("final_result", ""))
            result["quality_score"] = quality_score

            # Save memory
            agent_id = task.get("agent_id") or result.get("agent_used", "ceo")
            memory = self.memory.save_memory(
                task_id=task_id,
                agent_id=agent_id,
                result=result.get("final_result", ""),
                objective=task.get("description", ""),
                category=task.get("category", "general"),
                quality_score=quality_score,
                success=True,
            )
            result["memory_saved"] = memory is not None

            # Save to knowledge if high quality
            if quality_score >= 0.6:
                knowledge = self.knowledge.save_knowledge(
                    title=task.get("title", "Untitled"),
                    content=result.get("final_result", "")[:5000],
                    category=task.get("category", "general"),
                    source_agent=agent_id,
                )
                result["knowledge_saved"] = knowledge is not None

                # Async: generate embedding for new knowledge
                if knowledge:
                    try:
                        from services.rag.embedding_service import embedding_service
                        import asyncio
                        asyncio.create_task(embedding_service.embed_and_save(
                            knowledge["id"],
                            result.get("final_result", "")[:5000],
                        ))
                    except Exception as e:
                        logger.warning(f"Failed to queue embedding: {e}")
            else:
                result["knowledge_saved"] = False

            # Update task
            await self._update_task_completed(task_id, result=result.get("final_result", ""))

            result["task_id"] = task_id
            result["status"] = "completed"

            logger.info(
                f"Task {task_id} completed in {elapsed}s | quality={quality_score}"
            )
            return result

        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            await self._update_task_status(task_id, "failed")
            return self._error_result(task_id, str(e))

    async def _execute_collaborative(self, task: dict) -> dict:
        """Multi-agent collaboration with RAG context."""
        collaboration_result = await self.collaboration.run_collaboration(
            task_title=task.get("title", ""),
            task_description=task.get("description", ""),
        )
        return {
            "final_result": collaboration_result["final_result"],
            "agent_used": "ceo",
            "collaboration_used": True,
            "agents_contributed": collaboration_result.get("agents_contributed", []),
        }

    async def _execute_single_agent(self, task: dict) -> dict:
        """Single agent execution with RAG context."""
        agent_id = task.get("agent_id") or "ceo"
        agent_def = get_agent_definition(agent_id)

        # Inject RAG context (FASE 8)
        rag_ctx = await rag_context.get_context_for_task(
            task_title=task.get("title", ""),
            task_description=task.get("description", ""),
            agent_role=agent_id,
            limit=3,
        )

        prompt = f"""
Task: {task.get('title', '')}
Description: {task.get('description', '')}

{f'Relevant Context:\n{rag_ctx}' if rag_ctx else 'No prior knowledge available.'}

Complete this task thoroughly. If needed, invoke tools using this format:
<tool name="web_search" query="..." />
<tool name="knowledge_search" query="..." />
<tool name="calculator" expression="..." />
"""
        result = await self.llm.generate(
            prompt=prompt,
            system_context=agent_def.system_prompt if agent_def else "",
        )

        return {
            "final_result": result,
            "agent_used": agent_id,
            "collaboration_used": False,
            "agents_contributed": [agent_id],
        }

    def _calculate_quality_score(self, result: str) -> float:
        if not result or len(result.strip()) < 20:
            return 0.0

        score = 0.0
        length = len(result)

        if length > 200:
            score += 0.2
        if length > 500:
            score += 0.2
        if length > 1000:
            score += 0.1

        structure_keywords = [
            "recommendation", "analysis", "strategy", "plan", "summary",
            "##", "**", "1.", "2.", "3.", "•", "-",
        ]
        matches = sum(1 for kw in structure_keywords if kw.lower() in result.lower())
        score += min(matches * 0.05, 0.3)

        if any(kw in result.lower() for kw in ["objective", "conclusion", "therefore"]):
            score += 0.1

        return round(min(score, 1.0), 2)

    async def _get_task(self, task_id: str) -> dict | None:
        try:
            db = get_supabase()
            response = db.table("tasks").select("*").eq("id", task_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to get task: {e}")
            return None

    async def _update_task_status(self, task_id: str, status: str):
        try:
            db = get_supabase()
            db.table("tasks").update({"status": status}).eq("id", task_id).execute()
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")

    async def _update_task_completed(self, task_id: str, result: str):
        try:
            db = get_supabase()
            db.table("tasks").update({
                "status": "completed",
                "result": result[:10000],
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", task_id).execute()
        except Exception as e:
            logger.error(f"Failed to update completed task: {e}")

    def _error_result(self, task_id: str, error: str) -> dict:
        return {
            "task_id": task_id,
            "status": "failed",
            "error": error,
            "final_result": "",
            "agent_used": "unknown",
            "collaboration_used": False,
            "agents_contributed": [],
            "quality_score": 0.0,
            "memory_saved": False,
            "knowledge_saved": False,
            "execution_time_seconds": 0.0,
        }
