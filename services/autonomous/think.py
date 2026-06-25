# ============================================================
# BusinessAIOS - services/autonomous/think.py
# UPGRADED: scoring-based category detection + agent routing
# ============================================================

from core.logger import get_logger

logger = get_logger("ThinkEngine")


class ThinkEngine:
    """
    Analyzes a task to determine category, complexity,
    recommended agents and execution strategy.
    """

    CATEGORY_KEYWORDS = {
        "sales":       ["sales","lead","crm","pipeline","revenue","client","deal","conversion"],
        "marketing":   ["marketing","content","brand","campaign","seo","ads","social","copy"],
        "finance":     ["finance","roi","budget","cost","profit","margin","investment","cash"],
        "development": ["development","code","software","api","app","backend","frontend","tech"],
        "strategy":    ["strategy","plan","objective","goal","growth","expansion","vision"],
        "operations":  ["operations","process","workflow","team","hiring","sop","logistics"],
        "research":    ["research","analysis","market","competitor","data","trend","survey"],
    }

    CATEGORY_AGENT_MAP = {
        "sales":       ["commercial","research"],
        "marketing":   ["content","research"],
        "finance":     ["finance","ceo"],
        "development": ["operations","ceo"],
        "strategy":    ["research","commercial","content"],
        "operations":  ["operations","ceo"],
        "research":    ["research","ceo"],
        "general":     ["research","commercial","content"],
    }

    def analyze_task(self, title: str, description: str) -> dict:
        text = f"{title} {description}".lower()

        scores = {cat: 0 for cat in self.CATEGORY_KEYWORDS}
        for cat, keywords in self.CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw in text:
                    scores[cat] += 1

        best_category = max(scores, key=scores.get)
        if scores[best_category] == 0:
            best_category = "general"

        word_count = len(description.split())
        if word_count < 50:
            complexity, steps = "low", 3
        elif word_count < 150:
            complexity, steps = "medium", 5
        else:
            complexity, steps = "high", 8

        recommended_agents = self.CATEGORY_AGENT_MAP.get(
            best_category, ["research", "commercial", "content"]
        )

        result = {
            "objective": title,
            "category": best_category,
            "complexity": complexity,
            "estimated_steps": steps,
            "recommended_agents": recommended_agents,
            "use_collaboration": complexity in ("medium", "high"),
            "use_delegation": complexity == "high",
            "word_count": word_count,
        }

        logger.info(
            f"ThinkEngine | category={best_category} "
            f"complexity={complexity} agents={recommended_agents}"
        )
        return result

    def should_delegate(self, analysis: dict) -> bool:
        return analysis.get("use_delegation", False)

    def should_collaborate(self, analysis: dict) -> bool:
        return analysis.get("use_collaboration", True)
