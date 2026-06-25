# ============================================================
# BusinessAIOS - services/autonomous/autonomous_loop.py
# UPGRADED: Tool invocation + RAG context injection
# ============================================================

import asyncio
import time
from services.autonomous.think import ThinkEngine
from services.autonomous.plan import PlanEngine
from services.autonomous.execute import ExecutePhase
from services.autonomous.verify import VerifyEngine
from services.autonomous.learn import LearnEngine
from services.rag.rag_context import rag_context
from services.tools.tool_invocation import tool_invocation_parser, tool_invocation_executor
from services.events.event_bus import event_bus
from services.events.event_types import EventType
from core.logger import get_logger

logger = get_logger("AutonomousLoop")


class AutonomousLoop:
    """
    FASE 9 COMPLETE — Full autonomous loop with tool invocation.

    Think → Plan → Execute → [Tool Invocation] → Verify → Learn → Repeat
    """

    DEFAULT_MAX_RETRIES = 3
    MAX_TOOL_CALLS_PER_CYCLE = 3

    def __init__(self):
        self.think = ThinkEngine()
        self.plan = PlanEngine()
        self.execute = ExecutePhase()
        self.verify = VerifyEngine()
        self.learn = LearnEngine()

    async def run(
        self,
        task_id: str,
        title: str,
        description: str,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> dict:
        """Full autonomous loop execution."""
        start_time = time.time()
        cycle_history = []
        final_result = None
        goal_reached = False

        logger.info(f"AutonomousLoop START | task={task_id} max_retries={max_retries}")

        event_bus.publish(EventType.LOOP_CYCLE_STARTED, {
            "task_id": task_id,
            "max_retries": max_retries,
        })

        # Phase 1: Think (once)
        analysis = self.think.analyze_task(title, description)
        plan = self.plan.create_plan(title, description, analysis)

        for cycle in range(1, max_retries + 1):
            cycle_start = time.time()
            logger.info(f"Loop cycle {cycle}/{max_retries} | task={task_id}")

            event_bus.publish(EventType.LOOP_CYCLE_STARTED, {
                "task_id": task_id,
                "cycle": cycle,
                "plan_mode": plan["mode"],
            })

            try:
                # Phase 2: Execute
                exec_result = await self.execute.run(task_id=task_id, plan=plan)
                raw_output = exec_result.get("final_result", "")

                # Phase 2.5: Tool Invocation (NEW)
                tool_calls = tool_invocation_parser.extract_tool_calls(raw_output)
                if tool_calls:
                    logger.info(f"Tool calls detected: {len(tool_calls)}")
                    tool_results = await tool_invocation_executor.execute_calls(
                        tool_calls[:self.MAX_TOOL_CALLS_PER_CYCLE]
                    )
                    tool_context = tool_invocation_executor.format_results_for_prompt(tool_results)

                    # Re-prompt with tool results for refinement
                    from services.providers.llm_provider import get_llm_provider
                    from services.agents.agent_definitions import get_agent_definition

                    agent_id = exec_result.get("agent_used", "ceo")
                    agent_def = get_agent_definition(agent_id)
                    llm = get_llm_provider()

                    refinement_prompt = f"""
Original output:
{raw_output}

{tool_context}

Based on these tool results, refine your analysis. Incorporate the new information
and provide an updated, more accurate response.
"""
                    raw_output = await llm.generate(
                        prompt=refinement_prompt,
                        system_context=agent_def.system_prompt if agent_def else "",
                    )
                    exec_result["final_result"] = raw_output

                # Phase 3: Verify
                verification = self.verify.verify_result(
                    result=raw_output,
                    expected_category=analysis["category"],
                )

                # Phase 4: Learn
                agent_used = exec_result.get("agent_used", "ceo")
                learning = self.learn.learn_from_execution(
                    task_id=task_id,
                    agent_id=agent_used,
                    result=raw_output,
                    objective=description,
                    category=analysis["category"],
                    quality_score=verification["quality_score"],
                    verification=verification,
                )

                cycle_elapsed = round(time.time() - cycle_start, 2)
                cycle_record = {
                    "cycle": cycle,
                    "quality_score": verification["quality_score"],
                    "success": verification["success"],
                    "execution_time": cycle_elapsed,
                    "tool_calls_made": len(tool_calls) if tool_calls else 0,
                    "memory_saved": learning["memory_saved"],
                    "knowledge_saved": learning["knowledge_saved"],
                }
                cycle_history.append(cycle_record)

                event_bus.publish(EventType.LOOP_CYCLE_COMPLETED, {
                    "task_id": task_id,
                    "cycle": cycle,
                    "quality_score": verification["quality_score"],
                    "success": verification["success"],
                })

                if verification["success"]:
                    final_result = exec_result
                    goal_reached = True
                    logger.info(
                        f"AutonomousLoop GOAL REACHED | task={task_id} "
                        f"cycle={cycle} score={verification['quality_score']}"
                    )
                    event_bus.publish(EventType.LOOP_GOAL_REACHED, {
                        "task_id": task_id,
                        "cycles_taken": cycle,
                        "final_quality": verification["quality_score"],
                    })
                    break

                if cycle < max_retries:
                    await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Loop cycle {cycle} error: {e}")
                cycle_history.append({
                    "cycle": cycle,
                    "quality_score": 0.0,
                    "success": False,
                    "error": str(e),
                })
                if cycle < max_retries:
                    await asyncio.sleep(2)

        if not goal_reached:
            event_bus.publish(EventType.LOOP_GOAL_FAILED, {
                "task_id": task_id,
                "cycles_attempted": max_retries,
            })

        total_elapsed = round(time.time() - start_time, 2)
        best_cycle = max(cycle_history, key=lambda c: c.get("quality_score", 0), default={})

        return {
            "task_id": task_id,
            "goal_reached": goal_reached,
            "cycles_run": len(cycle_history),
            "final_quality_score": best_cycle.get("quality_score", 0.0),
            "final_result": final_result.get("final_result", "") if final_result else "",
            "agents_contributed": final_result.get("agents_contributed", []) if final_result else [],
            "plan": plan,
            "analysis": analysis,
            "cycle_history": cycle_history,
            "total_tool_calls": sum(c.get("tool_calls_made", 0) for c in cycle_history),
            "total_execution_time": total_elapsed,
        }
