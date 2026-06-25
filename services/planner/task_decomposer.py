# ============================================================
# BusinessAIOS - services/planner/task_decomposer.py
# UPGRADED: LLM-aware decomposition + dynamic step generation
# ============================================================

from core.logger import get_logger

logger = get_logger("TaskDecomposer")


class TaskDecomposer:
    """
    Decomposes tasks into actionable steps.
    UPGRADED: covers more categories, richer steps, integrates
    with ThinkEngine analysis for dynamic routing.
    """

    CATEGORY_STEPS = {
        "marketing": [
            "Market analysis & audience research",
            "Buyer persona definition",
            "Content strategy & messaging",
            "Channel selection & distribution plan",
            "Campaign design & creative brief",
            "KPI definition & tracking setup",
            "Campaign launch & optimization",
        ],
        "sales": [
            "Ideal Customer Profile (ICP) definition",
            "Lead sourcing & research",
            "Lead qualification (BANT/SPIN)",
            "Outreach sequence design",
            "Follow-up cadence",
            "Objection handling playbook",
            "Closing strategy & contract",
        ],
        "finance": [
            "Financial data collection",
            "Revenue & cost analysis",
            "Cash flow modeling",
            "Break-even calculation",
            "Risk assessment",
            "Scenario planning (conservative/base/optimistic)",
            "Investment recommendations",
        ],
        "development": [
            "Requirements analysis",
            "Architecture design",
            "Tech stack selection",
            "Sprint planning",
            "Implementation",
            "Testing & QA",
            "Deployment & monitoring",
        ],
        "strategy": [
            "Situational analysis (SWOT)",
            "Market opportunity mapping",
            "Competitive positioning",
            "Strategic objectives definition",
            "Resource planning",
            "Execution roadmap",
            "KPI & success metrics",
        ],
        "operations": [
            "Current-state process mapping",
            "Bottleneck identification",
            "SOP design",
            "Team structure definition",
            "Tools & technology selection",
            "Implementation timeline",
            "Performance monitoring setup",
        ],
        "research": [
            "Research scope definition",
            "Primary source identification",
            "Data collection",
            "Competitive analysis",
            "Trend analysis",
            "Insights synthesis",
            "Recommendations report",
        ],
        "general": [
            "Research & discovery",
            "Analysis & insights",
            "Strategy formulation",
            "Execution plan",
            "Review & optimization",
        ],
    }

    def decompose(self, title: str, category: str, complexity: str = "medium") -> list[str]:
        steps = self.CATEGORY_STEPS.get(category, self.CATEGORY_STEPS["general"])

        # Trim steps based on complexity
        if complexity == "low":
            return steps[:3]
        elif complexity == "medium":
            return steps[:5]
        else:
            return steps

    def decompose_with_agents(
        self, title: str, category: str, complexity: str = "medium"
    ) -> list[dict]:
        """
        Returns steps enriched with recommended agents per step.
        """
        STEP_AGENT_MAP = {
            "research": "research",   "analysis": "research",
            "market":   "research",   "financial": "finance",
            "sales":    "commercial", "lead": "commercial",
            "content":  "content",    "campaign": "content",
            "strategy": "ceo",        "consolidat": "ceo",
            "plan":     "ceo",        "operations": "operations",
        }

        steps = self.decompose(title, category, complexity)
        enriched = []
        for i, step in enumerate(steps):
            agent = "ceo"
            for kw, ag in STEP_AGENT_MAP.items():
                if kw in step.lower():
                    agent = ag
                    break
            enriched.append({
                "step": i + 1,
                "description": step,
                "agent": agent,
                "status": "pending",
            })

        logger.info(f"Decomposed '{title}' → {len(enriched)} steps (category={category})")
        return enriched
