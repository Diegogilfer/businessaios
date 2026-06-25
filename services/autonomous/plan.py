# ============================================================
# BusinessAIOS - services/autonomous/plan.py
# UPGRADED: full planning phase with LLM-powered step generation
# ============================================================

from services.autonomous.think import ThinkEngine
from core.logger import get_logger

logger = get_logger("PlanEngine")
think = ThinkEngine()


class PlanEngine:
    """
    Converts a task analysis into a concrete execution plan.
    Decides: which agents, which mode, in what order.
    """

    def create_plan(self, title: str, description: str, analysis: dict | None = None) -> dict:
        if not analysis:
            analysis = think.analyze_task(title, description)

        steps = []

        if analysis["use_delegation"]:
            steps = [
                {"step": 1, "action": "delegate", "agent": "ceo",
                 "description": "CEO breaks objective into sub-tasks"},
                {"step": 2, "action": "execute_subtasks", "agent": "all",
                 "description": "Specialist agents execute sub-tasks in parallel"},
                {"step": 3, "action": "consolidate", "agent": "ceo",
                 "description": "CEO consolidates into final deliverable"},
            ]
        elif analysis["use_collaboration"]:
            agent_steps = [
                {"step": i + 1, "action": "collaborate", "agent": ag,
                 "description": f"{ag.capitalize()} agent provides specialized analysis"}
                for i, ag in enumerate(analysis["recommended_agents"])
            ]
            agent_steps.append({
                "step": len(agent_steps) + 1, "action": "consolidate", "agent": "ceo",
                "description": "CEO consolidates all specialist inputs"
            })
            steps = agent_steps
        else:
            agent = analysis["recommended_agents"][0] if analysis["recommended_agents"] else "ceo"
            steps = [
                {"step": 1, "action": "execute", "agent": agent,
                 "description": f"Single-agent execution by {agent}"},
            ]

        plan = {
            "title": title,
            "category": analysis["category"],
            "complexity": analysis["complexity"],
            "mode": "delegation" if analysis["use_delegation"]
                    else "collaboration" if analysis["use_collaboration"]
                    else "single",
            "steps": steps,
            "total_steps": len(steps),
            "agents_involved": list({s["agent"] for s in steps}),
        }

        logger.info(
            f"PlanEngine | mode={plan['mode']} "
            f"steps={plan['total_steps']} agents={plan['agents_involved']}"
        )
        return plan
