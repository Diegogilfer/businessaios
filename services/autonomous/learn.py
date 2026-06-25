# ============================================================
# BusinessAIOS - services/autonomous/learn.py
# UPGRADED: full learning phase — extracts insights from results
# ============================================================

from core.logger import get_logger

logger = get_logger("LearnEngine")


class LearnEngine:
    """
    Learning phase of the autonomous loop.
    Extracts insights from execution results and persists them
    to Memory and KnowledgeBase for future agent improvement.
    """

    def __init__(self):
        from services.memory.memory_service import MemoryService
        from services.knowledge.knowledge_service import KnowledgeService
        self.memory = MemoryService()
        self.knowledge = KnowledgeService()

    def learn_from_execution(
        self,
        task_id: str,
        agent_id: str,
        result: str,
        objective: str,
        category: str,
        quality_score: float,
        verification: dict,
    ) -> dict:
        """
        Persist memory and conditionally save to global knowledge.
        Returns what was learned.
        """
        learned = {"memory_saved": False, "knowledge_saved": False, "insights": []}

        # Always save memory
        mem = self.memory.save_memory(
            task_id=task_id,
            agent_id=agent_id,
            result=result,
            objective=objective,
            category=category,
            quality_score=quality_score,
            success=verification.get("success", False),
        )
        learned["memory_saved"] = mem is not None

        # Only promote high-quality results to global knowledge
        if quality_score >= 0.60 and verification.get("success", False):
            kb = self.knowledge.save_knowledge(
                title=f"[{category.upper()}] {objective[:80]}",
                content=result[:5000],
                category=category,
                source_agent=agent_id,
                tags=[category, agent_id, f"q{int(quality_score*10)}"],
            )
            learned["knowledge_saved"] = kb is not None
            learned["insights"].append(f"High-quality result promoted to knowledge base (score={quality_score})")

        if not verification.get("success"):
            learned["insights"].append(
                f"Execution failed verification: {verification.get('reason', 'unknown')}"
            )

        logger.info(
            f"LearnEngine | task={task_id} "
            f"memory={learned['memory_saved']} "
            f"knowledge={learned['knowledge_saved']}"
        )
        return learned
