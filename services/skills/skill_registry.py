# ============================================================
# BusinessAIOS - services/skills/skill_registry.py
# FASE 9 — Dynamic skill registry for agent capabilities
# ============================================================

from core.logger import get_logger

logger = get_logger("SkillRegistry")


class Skill:
    def __init__(self, name: str, description: str, agent_roles: list[str], prompt_template: str):
        self.name = name
        self.description = description
        self.agent_roles = agent_roles     # which agents can use this skill
        self.prompt_template = prompt_template


class SkillRegistry:
    """
    Skills are reusable prompt templates that agents invoke
    to perform specific capabilities consistently.

    Example: "swot_analysis" skill used by Research + CEO agents.
    """

    def __init__(self):
        self._skills: dict[str, Skill] = {}
        self._register_core_skills()

    def register(self, skill: Skill):
        self._skills[skill.name] = skill
        logger.info(f"Skill registered: {skill.name}")

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def get_for_agent(self, agent_role: str) -> list[Skill]:
        return [s for s in self._skills.values() if agent_role in s.agent_roles]

    def list_skills(self) -> list[dict]:
        return [
            {"name": s.name, "description": s.description, "agents": s.agent_roles}
            for s in self._skills.values()
        ]

    def render(self, skill_name: str, **kwargs) -> str:
        skill = self.get(skill_name)
        if not skill:
            raise ValueError(f"Skill '{skill_name}' not found")
        return skill.prompt_template.format(**kwargs)

    def _register_core_skills(self):
        self.register(Skill(
            name="swot_analysis",
            description="Perform a SWOT analysis on a business or idea",
            agent_roles=["research", "ceo"],
            prompt_template=(
                "Perform a detailed SWOT analysis for: {subject}\n"
                "Context: {context}\n"
                "Structure: Strengths | Weaknesses | Opportunities | Threats\n"
                "For each quadrant provide 3-5 specific, actionable points."
            ),
        ))
        self.register(Skill(
            name="competitor_analysis",
            description="Analyze competitors in a market",
            agent_roles=["research", "commercial"],
            prompt_template=(
                "Analyze the competitive landscape for: {market}\n"
                "Identify top 3-5 competitors.\n"
                "For each: positioning, pricing, strengths, weaknesses, differentiators.\n"
                "Conclude with market gaps and opportunities."
            ),
        ))
        self.register(Skill(
            name="financial_projection",
            description="Build 12-month financial projections",
            agent_roles=["finance"],
            prompt_template=(
                "Build 12-month financial projections for: {business}\n"
                "Assumptions: {assumptions}\n"
                "Provide: Revenue model, Cost structure, Monthly P&L, Break-even, "
                "Cash flow timeline.\n"
                "Include conservative / base / optimistic scenarios."
            ),
        ))
        self.register(Skill(
            name="content_strategy",
            description="Design a content marketing strategy",
            agent_roles=["content"],
            prompt_template=(
                "Design a content marketing strategy for: {brand}\n"
                "Target audience: {audience}\n"
                "Include: Tone of voice, Content pillars, Channel strategy, "
                "30-day content calendar, KPIs."
            ),
        ))
        self.register(Skill(
            name="sales_funnel",
            description="Design a complete sales funnel",
            agent_roles=["commercial"],
            prompt_template=(
                "Design a complete sales funnel for: {product}\n"
                "Target customer: {customer}\n"
                "Include: Awareness → Interest → Consideration → Decision → Retention.\n"
                "Touchpoints, conversion tactics, and expected conversion rates per stage."
            ),
        ))


skill_registry = SkillRegistry()
